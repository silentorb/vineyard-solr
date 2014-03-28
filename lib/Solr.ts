/// <reference path="../defs/when.d.ts"/>
/// <reference path="../defs/metahub.d.ts"/>
/// <reference path="../defs/ground.d.ts"/>
/// <reference path="../defs/vineyard.d.ts"/>

import MetaHub = require('metahub')
import Ground = require('ground')
import Vineyard = require('vineyard')
import when = require('when')
import zlib = require('zlib');

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
  query
  suggestions:boolean
}

class Solr extends Vineyard.Bulb {

  grow() {
    Ground.Query_Builder.operators['solr'] = {
      "prepare": (filter, property):Promise => {
        var url = property.parent.name + '/select?q=' + property.name + ':*' + filter.value + '*&wt=json'
        return this.get_json(url)
          .then((response) => {
            var trellis = property.parent
            var primary = trellis.properties[trellis.primary_key]
            var ids = response.content.response.docs.map((doc)=> primary.get_sql_value(doc.guid))
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
      var query_builder = new Ground.Query_Builder(this.ground.trellises[i])
      query_builder.extend(solr_trellis.query)
      solr_trellis.query = query_builder

      this.listen(this.ground, i + ".update", (seed, update:Ground.Update):Promise =>
          this.update_entry(update.trellis.name, seed)
      )


    }

    var lawn = this.vineyard.bulbs['lawn']
    this.listen(lawn, 'http.start', ()=> {
      for (var i in config.trellises) {
        var solr_trellis = <Solr_Trellis>config.trellises[i]
        if (solr_trellis.suggestions)
          lawn.listen_public_http('/vineyard/solr/' + i + '/suggest', (req, res)=> this.suggest(req, res, i), 'get')
      }
    })

  }

  suggest(req, res, trellis_name:string):Promise {
    var url = trellis_name + '/suggest?q=' + req.query['q'] + '&wt=json'
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
    var server = config.solr_server
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
    var server = config.solr_server
    var def = when.defer()
    var http = require('http')
    var options = {
      host: server.host,
      port: server.port,
      path: server.path ? server.path + '/' + path : path,
      method: 'GET'
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
          res.content = JSON.parse(buffer)
          console.log('response2', res.content)
          def.resolve(res)
        })
      }
    })

    req.end()

    req.on('error', function (e) {
      console.log('problem with request: ' + e.message);
      def.reject()
    })

    return def.promise
  }

  post_update(trellis_name:string, data):Promise {
    return this.post(trellis_name + '/update/json?commit=true', data)
  }

  rebuild_indexes():Promise {
    return this.clear_all()
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

  clear(trellis_name:string):Promise {
    console.log('clearing', trellis_name)
    return this.post(trellis_name + '/update?commit=true', '<delete><query>*:*</query></delete>', 'xml')
  }

  clear_all():Promise {
    return this.perform_on_all_trellises((name)=>
        this.clear(name)
    )
  }

  create_update(trellis_name:string):Promise {
    return this.create_trellis_updates(trellis_name)
      .then((updates)=> {
        console.log('update-solr', trellis_name, JSON.stringify(updates))
        return this.post_update(trellis_name, updates)
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
    return this.post_update(trellis_name, [ update ])
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