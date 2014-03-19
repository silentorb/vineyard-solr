/// <reference path="../defs/when.d.ts"/>
/// <reference path="../defs/metahub.d.ts"/>
/// <reference path="../defs/ground.d.ts"/>
/// <reference path="../defs/vineyard.d.ts"/>

import MetaHub = require('metahub')
import Ground = require('ground')
import Vineyard = require('vineyard')
import when = require('when')

interface Solr_Server_Config {
  host:string
  port:number
  path?:string
}

interface Solr_Config {
  solr_server:Solr_Server_Config
  trellises
}

interface Solr_Trellis {
  properties: string[]
}

class Solr extends Vineyard.Bulb {

  grow() {

  }

  post(path, data):Promise {
    var config = <Solr_Config>this.config
    var server = config.solr_server
    var def = when.defer()
    var http = require('http')
    var options = {
      host: server.host,
      port: server.port,
      path: server.path ? server.path + '/' + path : path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }

    var req = http.request(options, function (res) {
      if (res.statusCode != '200') {
        res.setEncoding('utf8')
        res.on('data', function (chunk) {
          console.log('client received an error:', res.statusCode, chunk)
          def.reject()
        })
      }
      else {
        res.on('data', function (data) {
          res.content = JSON.parse(data)
          def.resolve(res)
        })
      }
    })

    req.write(JSON.stringify(data))
    req.end()

    req.on('error', function (e) {
      console.log('problem with request: ' + e.message);
      def.reject()
    })

    return def.promise
  }

  rebuild_indexes():Promise {
    var config = <Solr_Config>this.config
    var updates = []
    var promises = []
    for (var i in config.trellises) {
      promises.push(this.create_trellis_updates(i, updates))
    }

    return when.all(promises)
      .then(()=> {
        return this.post('update/json', updates)
      })
  }

  create_update(trellis_name:string) {

  }

  create_trellis_updates(trellis_name:string, updates):Promise {
    var config = <Solr_Config>this.config
    var solr_trellis = config.trellises[trellis_name]
    var trellis = this.ground.trellises[trellis_name]
    var query = this.ground.create_query(trellis)
    query.properties = {}
    var properties = trellis.get_all_properties()
    for (var p in solr_trellis.properties) {
      query.properties[p] = properties[p]
    }
    return query.run()
      .then((rows) => {
        for (var i in rows) {
//          var update = {}
          updates.push(rows[i])
        }
      })
  }
}

export = Solr