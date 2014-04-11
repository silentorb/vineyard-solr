var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MetaHub = require('vineyard-metahub');
var Ground = require('vineyard-ground');
var Vineyard = require('vineyard');
var when = require('when');

var Solr = (function (_super) {
    __extends(Solr, _super);
    function Solr() {
        _super.apply(this, arguments);
    }
    Solr.prototype.grow = function () {
        var _this = this;
        Ground.Query_Builder.operators['solr'] = {
            "prepare": function (filter, property) {
                var url = _this.get_core() + '/select?q=' + property.name + ':*' + encodeURIComponent(filter.value) + '*&wt=json';

                return _this.get_json(url).then(function (response) {
                    var trellis = property.parent;
                    var primary = trellis.properties[trellis.primary_key];
                    var docs = response.content.response.docs;
                    if (!docs.length) {
                        return false;
                    }

                    var ids = docs.map(function (doc) {
                        return primary.get_sql_value(doc[trellis.primary_key]);
                    });
                    filter.value = ids.join(', ');
                });
            },
            "render": function (result, filter, property, data) {
                var trellis = property.parent;
                var primary = trellis.properties[trellis.primary_key];
                result.filters.push(primary.query() + ' IN (' + filter.value + ')');
            }
        };

        var config = this.config;
        for (var i in config.trellises) {
            var solr_trellis = config.trellises[i];
            solr_trellis.core = solr_trellis.core || i;
            var query_builder = new Ground.Query_Builder(this.ground.trellises[i]);
            query_builder.extend(solr_trellis.query);
            solr_trellis.query = query_builder;

            this.listen(this.ground, i + ".update", function (seed, update) {
                return _this.update_entry(update.trellis.name, seed);
            });
        }

        var lawn = this.vineyard.bulbs['lawn'];
        if (lawn) {
            this.listen(lawn, 'http.start', function () {
                for (var i in config.trellises) {
                    var solr_trellis = config.trellises[i];
                    if (solr_trellis.suggestions)
                        lawn.listen_public_http('/vineyard/solr/' + _this.get_core() + '/suggest', function (req, res) {
                            return _this.suggest(req, res, i);
                        }, 'get');
                }
            });
        }
    };

    Solr.prototype.get_core = function () {
        var config = this.config;
        return config.server.core;
    };

    Solr.prototype.suggest = function (req, res, trellis_name) {
        var url = this.get_core() + '/suggest?q=' + encodeURIComponent(req.query['q']) + '&wt=json';
        return this.get_json(url).then(function (response) {
            var suggestions = [];
            var source = response.content.suggest[trellis_name + '_suggest'];
            var result = source[Object.keys(source)[0]];
            if (result && typeof result === 'object') {
                suggestions = result.suggestions;
            }

            res.send({
                objects: suggestions
            });
        });
    };

    Solr.prototype.post = function (path, data, mode) {
        if (typeof mode === "undefined") { mode = 'json'; }
        var config = this.config;
        var server = config.server;
        var def = when.defer();
        var http = require('http');
        var options = {
            host: server.host,
            port: server.port,
            path: server.path ? server.path + '/' + path : path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/' + mode
            }
        };

        var req = http.request(options, function (res) {
            if (res.statusCode != '200') {
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('client received an error:', res.statusCode, chunk);
                    def.reject();
                });
            } else {
                var buffer = '';
                res.on('data', function (chunk) {
                    buffer += chunk;
                });

                res.on('end', function () {
                    res.content = mode == 'json' ? JSON.parse(buffer) : buffer.toString();
                    def.resolve(res);
                });
            }
        });

        req.write(mode == 'json' ? JSON.stringify(data) : data);
        req.end();

        req.on('error', function (e) {
            console.log('problem with request: ' + e.message);
            def.reject();
        });

        return def.promise;
    };

    Solr.prototype.get_json = function (path) {
        var config = this.config;
        var server = config.server;
        var def = when.defer();
        var http = require('http');
        var options = {
            host: server.host,
            port: server.port,
            path: server.path ? server.path + '/' + path : path,
            method: 'GET'
        };

        var req = http.request(options, function (res) {
            res.setEncoding('utf8');
            var buffer = '';
            res.on('data', function (chunk) {
                buffer += chunk;
            });

            res.on('end', function () {
                if (buffer.length > 0)
                    res.content = JSON.parse(buffer);

                if (res.statusCode != '200') {
                    console.log('client received an error:', res.statusCode, buffer);
                    def.reject();
                } else {
                    def.resolve(res);
                }
            });
        });

        req.end();

        req.on('error', function (e) {
            console.log('problem with request: ' + e.message);
            def.reject();
        });

        return def.promise;
    };

    Solr.prototype.post_update = function (data) {
        return this.post(this.get_core() + '/update/json?commit=true', data);
    };

    Solr.prototype.rebuild_indexes = function () {
        var _this = this;
        return this.clear().then(function () {
            return _this.perform_on_all_trellises(function (name) {
                return _this.create_update(name);
            });
        });
    };

    Solr.prototype.perform_on_all_trellises = function (action) {
        var pipeline = require('when/pipeline');
        var config = this.config;
        var promises = [];
        for (var i in config.trellises) {
            promises.push(function () {
                return action(i);
            });
        }

        return pipeline(promises);
    };

    Solr.prototype.clear = function () {
        return this.post(this.get_core() + '/update?commit=true', '<delete><query>*:*</query></delete>', 'xml');
    };

    Solr.prototype.create_update = function (trellis_name) {
        var _this = this;
        return this.create_trellis_updates(trellis_name).then(function (updates) {
            console.log('update-solr', trellis_name, JSON.stringify(updates));
            return _this.post_update(updates);
        });
    };

    Solr.prototype.update_entry = function (trellis_name, seed) {
        var config = this.config;
        var solr_trellis = config.trellises[trellis_name];
        var update = {};
        for (var i in solr_trellis.query.properties) {
            if (seed[i] !== undefined)
                update[i] = seed[i];
        }

        console.log('update-solr2', trellis_name, JSON.stringify(update));
        return this.post_update([update]);
    };

    Solr.prototype.create_trellis_updates = function (trellis_name) {
        var config = this.config;
        var solr_trellis = config.trellises[trellis_name];
        var trellis = this.ground.trellises[trellis_name];
        var query = this.ground.create_query(trellis);
        query.extend(solr_trellis.query);

        return query.run().then(function (rows) {
            var updates = [];
            for (var i in rows) {
                updates.push(rows[i]);
            }
            return updates;
        });
    };
    return Solr;
})(Vineyard.Bulb);

module.exports = Solr;
//# sourceMappingURL=Solr.js.map
