import FormData from 'form-data'
import axios from 'axios'
const tempImage = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
var request = require('request').defaults({ encoding: null });
import JSON from 'json'
const transformFile = async f => {
  const {value, type} = f
  const res = request.get(value,(err,res2,body)=>{
  })
  return [
    res,
    {
      filename: 'unicycle.png', // ... or:
      filetype:'image/png'
    }
  ]
}
export const transform = async o => {
  let fd = new FormData()
  let returnFormData = false
  Object.keys(o).map(async k => {
    let val = o[k]
    if (
      typeof val === 'object' &&
      val.hasOwnProperty('type') &&
      val.type === 'file'
    ) {
      returnFormData = true
      val = await transformFile(val)
    } else if (typeof val === 'object') {
      val = [JSON.stringify(val)]
    } else {
      val = [val]
    }
    console.log(k, val)
    fd.append(k, ...val)
    return val
  })
  return returnFormData ? fd : o
}
