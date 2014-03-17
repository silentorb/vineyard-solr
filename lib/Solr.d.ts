/// <reference path="../defs/when.d.ts" />
/// <reference path="../defs/metahub.d.ts" />
/// <reference path="../defs/ground.d.ts" />
/// <reference path="../defs/vineyard.d.ts" />
declare class Solr extends Vineyard.Bulb {
    public grow(): void;
    public post(path: any, data: any): Promise;
    public rebuild_indexes(): Promise;
    public create_update(trellis_name: string): void;
    public create_trellis_updates(trellis_name: string, updates: any): Promise;
}
export = Solr;
