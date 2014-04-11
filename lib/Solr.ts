/// <reference path="../../vineyard/vineyard.d.ts"/>

import MetaHub = require('vineyard-metahub')
import Ground = require('vineyard-ground')
import Vineyard = require('vineyard')
import when = require('when')
import zlib = require('zlib');

interface Solr_Server_Config {
  host:string
  port:number
  path?:string
  core:string
}

interface Solr_Config {
  server:Solr_Server_Config
  trellises
}

interface Solr_Trellis {
  query
  suggestions:boolean
  core?:string
}

class Solr extends Vineyard.Bulb {

  grow() {
    Ground.Query_Builder.operators['solr'] = {
      "prepare": (filter, property):Promise => {
        var url = this.get_core() + '/select?q=' + property.name + ':*' + encodeURIComponent(filter.value) + '*&wt=json'
//        console.log('solr-query', url)
        return this.get_json(url)
          .then((response) => {
//            console.log('solr result', response)
            var trellis = property.parent
            var primary = trellis.properties[trellis.primary_key]
            var docs = response.content.response.docs
            if (!docs.length) {
              return false
            }

            var ids = docs.map((doc)=> primary.get_sql_value(doc[trellis.primary_key]))
            filter.value = ids.join(', ')
          })
      },
      "render": (result, filter, property, data)=> {
        var trellis = property.parent
        var primary = trellis.properties[trellis.primary_key]
        result.filters.push(primary.query() + ' IN (' + filter.value + ')')
      }
    }

    var config = <Solr_Config>this.config
    for (var i in config.trellises) {
      var solr_trellis = <Solr_Trellis>config.trellises[i]
      solr_trellis.core = solr_trellis.core || i
      var query_builder = new Ground.Query_Builder(this.ground.trellises[i])
      query_builder.extend(solr_trellis.query)
      solr_trellis.query = query_builder

      this.listen(this.ground, i + ".update", (seed, update:Ground.Update):Promise =>
          this.update_entry(update.trellis.name, seed)
      )
    }

    var lawn = this.vineyard.bulbs['lawn']
    if (lawn) {
      this.listen(lawn, 'http.start', ()=> {
        for (var i in config.trellises) {
          var solr_trellis = <Solr_Trellis>config.trellises[i]
          if (solr_trellis.suggestions)
            lawn.listen_public_http('/vineyard/solr/' + this.get_core() + '/suggest',
              (req, res)=> this.suggest(req, res, i), 'get')
        }
      })
    }
  }

  get_core():string {
    var config = <Solr_Config>this.config
    return config.server.core
  }

  suggest(req, res, trellis_name:string):Promise {
    var url = this.get_core() + '/suggest?q=' + encodeURIComponent(req.query['q']) + '&wt=json'
    return this.get_json(url)
      .then((response)=> {
        var suggestions = []
        var source = response.content.suggest[trellis_name + '_suggest']
        var result = source[Object.keys(source)[0]]
        if (result && typeof result === 'object') {
          suggestions = result.suggestions
        }

        res.send({
          objects: suggestions
        })
      })
  }

  post(path, data, mode = 'json'):Promise {
    var config = <Solr_Config>this.config
    var server = config.server
    var def = when.defer()
    var http = require('http')
    var options = {
      host: server.host,
      port: server.port,
      path: server.path ? server.path + '/' + path : path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/' + mode,
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
        var buffer = ''
        res.on('data', function (chunk) {
          buffer += chunk
        })

        res.on('end', function () {
          res.content = mode == 'json' ? JSON.parse(buffer) : buffer.toString()
          def.resolve(res)
        })
      }
    })

    req.write(mode == 'json' ? JSON.stringify(data) : data)
    req.end()

    req.on('error', function (e) {
      console.log('problem with request: ' + e.message);
      def.reject()
    })

    return def.promise
  }

  get_json(path):Promise {
    var config = <Solr_Config>this.config
    var server = config.server
    var def = when.defer()
    var http = require('http')
    var options = {
      host: server.host,
      port: server.port,
      path: server.path ? server.path + '/' + path : path,
      method: 'GET'
    }

    var req = http.request(options, function (res) {
      res.setEncoding('utf8')
      var buffer = ''
      res.on('data', function (chunk) {
        buffer += chunk
      })

      res.on('end', function () {
        if (buffer.length > 0)
          res.content = JSON.parse(buffer)

        if (res.statusCode != '200') {
          console.log('client received an error:', res.statusCode, buffer)
          def.reject()
        }
        else {
          def.resolve(res)
        }
      })
    })

    req.end()

    req.on('error', function (e) {
      console.log('problem with request: ' + e.message);
      def.reject()
    })

    return def.promise
  }

  post_update(data):Promise {
    return this.post(this.get_core() + '/update/json?commit=true', data)
  }

  rebuild_indexes():Promise {
    return this.clear()
      .then(()=>
        this.perform_on_all_trellises((name)=>
            this.create_update(name)
        )
    )
  }

  perform_on_all_trellises(action):Promise {
    var pipeline = require('when/pipeline')
    var config = <Solr_Config>this.config
    var promises = [ ]
    for (var i in config.trellises) {
      promises.push(()=> action(i))
    }

    return pipeline(promises)
  }

  clear():Promise {
    return this.post(this.get_core() + '/update?commit=true', '<delete><query>*:*</query></delete>', 'xml')
  }

  create_update(trellis_name:string):Promise {
    return this.create_trellis_updates(trellis_name)
      .then((updates)=> {
        console.log('update-solr', trellis_name, JSON.stringify(updates))
        return this.post_update(updates)
      })
  }

  update_entry(trellis_name:string, seed):Promise {
    var config = <Solr_Config>this.config
    var solr_trellis = config.trellises[trellis_name]
    var update = {}
    for (var i in solr_trellis.query.properties) {
      if (seed[i] !== undefined)
        update[i] = seed[i]
    }

    console.log('update-solr2', trellis_name, JSON.stringify(update))
    return this.post_update([ update ])
  }

  create_trellis_updates(trellis_name:string):Promise {
    var config = <Solr_Config>this.config
    var solr_trellis = config.trellises[trellis_name]
    var trellis = this.ground.trellises[trellis_name]
    var query = this.ground.create_query(trellis)
    query.extend(solr_trellis.query)

    return query.run()
      .then((rows) => {
        var updates = []
        for (var i in rows) {
//          var update = {}
          updates.push(rows[i])
        }
        return updates
      })
  }
}

export = Solr