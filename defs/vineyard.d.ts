/// <reference path="node.d.ts" />
/// <reference path="metahub.d.ts" />
/// <reference path="ground.d.ts" />
interface Bulb_Configuration {
    path?: string;
    class?: string;
    parent?: string;
}
declare class Vineyard {
    public bulbs: any;
    public config: any;
    public config_folder: any;
    public ground: Ground.Core;
    public root_path: string;
    constructor(config_file?: string);
    static create_ground(db_name: string, databases: any, trellis_files: any): Ground.Core;
    public get_bulb(name: string): Promise;
    public load_bulbs(bulbs: any): void;
    public load(config_file: string): void;
    public start(): void;
}
declare module Vineyard {
    interface IUser {
        id?: any;
        name?: string;
        roles?: IRole[];
    }
    interface IRole {
        id?: any;
        name?: string;
    }
    class Bulb extends MetaHub.Meta_Object {
        public vineyard: Vineyard;
        public config: any;
        public ground: Ground.Core;
        constructor(vineyard: Vineyard, config: any);
        public grow(): void;
        public start(): void;
        public stop(): void;
    }
}
declare module "vineyard" {
  export = Vineyard
}