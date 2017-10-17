import axios from 'axios'
import Server from 'syncano-server'
import {transform} from './helpers/transform'
import NodeCache from 'node-cache'
var linkCache = linkCache?linkCache:new NodeCache()
export default async ctx => {
  const MAX_OVERLOAD = 1000
  const {data, users, socket, response, event, logger, instance} = Server(ctx)
  const {model, link, payload, key, token, header, fields} = ctx.args
  const {MIGRATE_KEY} = ctx.config
  const log = logger('Migrate')
  if (key === MIGRATE_KEY) {
    let conf = {}
    if (token && header) {
      conf.headers = {
        [header]: token
      }
    }
    try {
      let status = await data.migration_status.where('model', model).list()
      log.info(status)
      if (status.length === 0) {
        status = [
          await data.migration_status.create({
            model,
            status: 'migrating',
            mids: []
          })
        ]
      }
      let oldObjects
      if (link) {
        oldObjects = linkCache.get(link)
        if (oldObjects === undefined) {
          oldObjects = (await axios.get(link, conf)).data
          linkCache.set(link, oldObjects, 10000)
          log.info('Setting Cache')
        } else {
          log.info('Object gathered from Cache')
        }
      } else if (payload) {
        oldObjects = typeof payload === 'string' ? JSON.parse(payload) : payload
      }
      const objectsAlreadyInDatabase = status.reduce((a, b) => {
        return [...a, ...b.mids]
      }, [])
      const createObject = oldObjects.filter(
        old => objectsAlreadyInDatabase.indexOf(old.id) === -1
      )
      if (createObject.length === 0) {
        return response.json(
          {
            status: 'end',
            message: 'No more objects to migrate'
          },
          200
        )
      }
      const objectReadyToMigrate = createObject[0]
      let newObject = {}
      for (var f of fields) {
        let fieldValue = objectReadyToMigrate[f]
        newObject[f] = fieldValue
      }
      const transformedObject = await transform(newObject, data)
      const obj = await data[model].create(transformedObject)
      const migrateIdPair = await data.migration_pair.create({
        model,
        old: objectReadyToMigrate.id,
        new: obj.id
      })
      const migratingStatuses = status.filter(st => st.status === 'migrating')
      if (migratingStatuses.length === 0) {
        const newStatus = await data.migration_status.create({
          model,
          status: 'migrating',
          mids: [objectReadyToMigrate.id],
          progress: `${objectsAlreadyInDatabase.length + 1}/${oldObjects.length}`
        })
      } else {
        const migratingStatus = migratingStatuses[0]
        const newMids = [...migratingStatus.mids, objectReadyToMigrate.id]
        const updatedStatus = await data.migration_status.update(
          migratingStatus.id,
          {
            mids: newMids,
            status: newMids.length >= MAX_OVERLOAD ? 'overload' : 'migrating',
            progress: `${objectsAlreadyInDatabase.length + 1}/${oldObjects.length}`
          }
        )
      }
      return response.json(
        {
          created: obj,
          status: 'migrating',
          progress: `${objectsAlreadyInDatabase.length + 1}/${oldObjects.length}`
        },
        200
      )
    } catch ({data}) {
      return response.json(data)
    }
  } else {
    return response.json(
      {
        status: 'error',
        message: 'Incorrect MIGRATE_KEY'
      },
      401
    )
  }
}
