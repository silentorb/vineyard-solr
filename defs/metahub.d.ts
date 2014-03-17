/// <reference path="when.d.ts" />
declare module MetaHub {
    function remove(array: any, item: any): void;
    function has_properties(obj: any): boolean;
    function is_array(obj: any): boolean;
    function size(obj: any): number;
    function S4(): string;
    function values(source: any): {}[];
    function concat(destination: any, source: any): {};
    function extend(destination: any, source: any, names?: any): any;
    function guid(): string;
    function clone(source: any, names: any): {};
    function get_connection(a: any, b: any): any;
    function filter(source: any, check: (value: any, key?: any, source?: any) => boolean): {};
    function map(source: any, action: any): {};
    function map_to_array(source: any, action: any): any[];
    class Meta_Object {
        public is_meta_object: boolean;
        private events;
        private internal_connections;
        static connect_objects(first: any, other: any, type: any): boolean;
        static disconnect_objects(first: any, other: any): void;
        static has_property(target: any, name: any): boolean;
        static invoke_binding(source: any, owner: any, name: any): void;
        public listen(other: Meta_Object, name: string, method: any, options?: any): void;
        public unlisten(other: any, name: any): void;
        public invoke(name: string, ...args: any[]): Promise;
        public map_invoke(name: string, ...args: any[]): Promise[];
        public gather(name: any): any;
        public connect(other: Meta_Object, type: string, other_type?: string): void;
        public disconnect(other: any): void;
        public disconnect_all(type: any): void;
        public is_listening(other: any, name: any): boolean;
        public get_connections(...filters: any[]): any[];
        public get_connection(filter: any): any;
        public define_connection_getter(property_name: any, connection_name: any): void;
        public define_object(property_name: any, connection_name: any): void;
        public optimize_getter(property_name: any, connection_name: any): void;
    }
    class Meta_Connection {
        public other: Meta_Object;
        public parent: Meta_Object;
        public type: string;
        constructor(parent: any, other: any, type: any);
    }
}

declare module "metahub" {
  export = MetaHub
}