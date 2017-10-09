import axios from 'axios'
import Server from 'syncano-server'
import {transform} from './helpers/transform'
export default async ctx => {
  const {data, users, socket, response, event, logger, instance} = Server(ctx)
  const {model, link, key, token, header, fields} = ctx.args
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
      const oldObjects = (await axios.get(link, conf)).data
      const objectsAlreadyInDatabase = (await data[model].list()).map(
        m => m.migrate_id
      )
      console.log(objectsAlreadyInDatabase)
      const createObject = oldObjects.filter(
        old => objectsAlreadyInDatabase.indexOf(old.id) === -1
      )
      if (createObject.length === 0){
        response.json({
          status:"No more objects to migrate"
        })
      }
      const objectReadyToMigrate = createObject[0]
      let newObject = {}
      for (var f of fields) {
        let fieldValue = objectReadyToMigrate[f]
        newObject[f] = fieldValue
      }
      newObject['migrate_id'] = objectReadyToMigrate.id
      const transformedObject = await transform(newObject)
      const obj = await data[model].create(transformedObject)
      return response.json({
        created:obj,
        status:`${objectsAlreadyInDatabase.length+1}/${oldObjects.length}`
      })
    } catch ({data}) {
      return response.json(data)
    }
  } else {
    response.json({
      status: 'Incorrect MIGRATE_KEY'
    })
  }
}
