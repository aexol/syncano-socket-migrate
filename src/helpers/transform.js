import FormData from 'form-data'
import axios from 'axios'
const tempImage = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
var request = require('request').defaults({encoding: null})
const transformFile = async f => {
  const {value, type} = f
  const res = request.get(value, (err, res2, body) => {})
  return [
    res,
    {
      filename: 'unicycle.png', // ... or:
      filetype: 'image/png'
    }
  ]
}
export const transform = async (o, data) => {
  let fd = new FormData()
  const newo = await Promise.all(
    Object.keys(o).map(async k => {
      let val = o[k]
      if (val === null) {
        return
      }
      if (
        typeof val === 'object' &&
        val.hasOwnProperty('type') &&
        val.type === 'file'
      ) {
        val = await transformFile(val)
      } else if (
        typeof val === 'object' &&
        val.hasOwnProperty('type') &&
        val.type === 'reference'
      ) {
        try {
          val = [
            (await data.migration_pair
              .where('model', val.target)
              .where('old', val.value)
              .list())[0].new
          ]
        } catch (error) {
          // TODO Handle error
        }
      } else if (
        typeof val === 'object' &&
        val.hasOwnProperty('type') &&
        val.type === 'relation'
      ) {
        val = [
          JSON.stringify(
            (await data.migration_pair
              .where('model', val.target)
              .where('old', 'in', val.value)
              .list()).map(o => o.new)
          )
        ]
        // TODO Handle error
      } else if (typeof val === 'object' || Array.isArray(val)) {
        val = [JSON.stringify(val)]
      } else {
        val = [val]
      }
      fd.append(k, ...val)
      return val
    })
  )
  return fd
}
