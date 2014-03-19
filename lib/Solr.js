var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MetaHub = require('metahub');
var Ground = require('ground');
var Vineyard = require('vineyard');
var when = require('when');

var Solr = (function (_super) {
    __extends(Solr, _super);
    function Solr() {
        _super.apply(this, arguments);
    }
    Solr.prototype.grow = function () {
    };

    Solr.prototype.post = function (path, data) {
        var config = this.config;
        var server = config.solr_server;
        var def = when.defer();
        var http = require('http');
        var options = {
            host: server.host,
            port: server.port,
            path: server.path ? server.path + '/' + path : path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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
                res.on('data', function (data) {
                    res.content = JSON.parse(data);
                    def.resolve(res);
                });
            }
        });

        req.write(JSON.stringify(data));
        req.end();

        req.on('error', function (e) {
            console.log('problem with request: ' + e.message);
            def.reject();
        });

        return def.promise;
    };

    Solr.prototype.rebuild_indexes = function () {
        var _this = this;
        var config = this.config;
        var updates = [];
        var promises = [];
        for (var i in config.trellises) {
            promises.push(this.create_trellis_updates(i, updates));
        }

        return when.all(promises).then(function () {
            return _this.post('update/json', updates);
        });
    };

    Solr.prototype.create_update = function (trellis_name) {
    };

    Solr.prototype.create_trellis_updates = function (trellis_name, updates) {
        var config = this.config;
        var solr_trellis = config.trellises[trellis_name];
        var trellis = this.ground.trellises[trellis_name];
        var query = this.ground.create_query(trellis);
        query.properties = {};
        var properties = trellis.get_all_properties();
        for (var p in solr_trellis.properties) {
            query.properties[p] = properties[p];
        }
        return query.run().then(function (rows) {
            for (var i in rows) {
                updates.push(rows[i]);
            }
        });
    };
    return Solr;
})(Vineyard.Bulb);

module.exports = Solr;
//# sourceMappingURL=Solr.js.map
