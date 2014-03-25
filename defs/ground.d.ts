
/// <reference path="when.d.ts" />

/// <reference path="metahub.d.ts" />
declare var when: any;
declare module Ground {
    class Database {
        public settings: any;
        public database: string;
        public log_queries: boolean;
        public pool: any;
        constructor(settings: {}, database: string);
        public add_table_to_database(table: Ground.Table, ground: Ground.Core): Promise;
        public add_non_trellis_tables_to_database(tables: Ground.Table[], ground: Ground.Core): Promise;
        public create_table(trellis: Ground.Trellis): Promise;
        public create_trellis_tables(trellises: Ground.Trellis[]): Promise;
        public drop_all_tables(): Promise;
        public get_tables(): Promise;
        public query(sql: string, args?: any[]): Promise;
        public query_single(sql: string, args?: any[]): Promise;
    }
}
declare module Ground {
    interface ITrellis {
    }
    class Trellis implements ITrellis {
        public plural: string;
        public parent: Trellis;
        public ground: Ground.Core;
        public table: Ground.Table;
        public name: string;
        public primary_key: string;
        public properties: {
            [name: string]: Ground.Property;
        };
        public all_properties: {
            [name: string]: Ground.Property;
        };
        public is_virtual: boolean;
        constructor(name: string, ground: Ground.Core);
        public add_property(name: string, source: any): Ground.Property;
        public check_primary_key(): void;
        public clone_property(property_name: string, target_trellis: Trellis): void;
        public get_all_links(filter?: (property: Ground.Property) => boolean): {};
        public get_all_properties(): {};
        public get_core_properties(): {};
        public get_id(source: any): any;
        public get_identity(seed: any): {};
        public get_ancestor_join(other: Trellis): string;
        public get_links(): Ground.Property[];
        public get_plural(): string;
        public get_primary_keys(): any[];
        public get_reference_property(other_trellis: Trellis): Ground.Property;
        public get_root_table(): Ground.Table;
        public get_table_name(): string;
        public get_table_query(): string;
        public get_tree(): Trellis[];
        public initialize(all: any): void;
        public load_from_object(source: Ground.ITrellis_Source): void;
        public query_primary_key(): string;
        public sanitize_property(property: any): any;
        public set_parent(parent: Trellis): void;
    }
}
declare module Ground {
    interface IService_Response {
        objects: any[];
    }
    interface Query_Filter_Source {
        property?: string;
        path?: string;
        value: any;
        operator?: string;
    }
    interface Query_Wrapper {
        start: string;
        end: string;
    }
    interface Property_Query_Source {
        name: string;
        filters?: Query_Filter_Source[];
        sorts?: Ground.Query_Sort[];
        expansions?: string[];
        properties?: any[];
        subqueries?: any;
        pager?: any;
    }
    interface External_Query_Source extends Property_Query_Source {
        trellis: string;
    }
    interface Internal_Query_Source {
        fields?: any;
        filters?: any[];
        joins?: string[];
        arguments?: any;
    }
    class Query {
        public ground: Ground.Core;
        public joins: string[];
        public post_clauses: any[];
        public limit: string;
        public trellis: Ground.Trellis;
        public db: Ground.Database;
        public include_links: boolean;
        public fields: string[];
        public base_path: string;
        public arguments: {};
        public expansions: string[];
        public wrappers: Query_Wrapper[];
        private row_cache;
        public type: string;
        public properties: any;
        public source: External_Query_Source;
        public sorts: Ground.Query_Sort[];
        public filters: string[];
        public run_stack: any;
        public property_filters: Query_Filter_Source[];
        static operators: string[];
        private links;
        constructor(trellis: Ground.Trellis, base_path?: string);
        public add_arguments(args: any): void;
        public add_filter(clause: string, arguments?: any[]): void;
        public add_property_filter(property: string, value?: any, operator?: string): void;
        public add_key_filter(value: any): void;
        public add_field(clause: string, arguments?: any): void;
        public add_join(clause: string, arguments?: any): void;
        public add_post(clause: string, arguments?: any): void;
        public add_expansion(clause: any): void;
        public add_link(property: any): void;
        public add_sort(sort: Ground.Query_Sort): void;
        static process_sorts(sorts: Ground.Query_Sort[], trellis: Ground.Trellis): string;
        public add_wrapper(wrapper: Query_Wrapper): void;
        public generate_pager(offset?: number, limit?: number): string;
        public generate_sql(properties: any): string;
        public get_fields_and_joins(properties: {
            [name: string]: Ground.Property;
        }, include_primary_key?: boolean): Internal_Query_Source;
        public get_primary_key_value(): any;
        static generate_property_join(property: Ground.Property, seeds: any): string;
        public create_sub_query(trellis: Ground.Trellis, property: Ground.Property): Query;
        public get_many_list(seed: any, property: Ground.Property, relationship: Ground.Relationships): Promise;
        public get_path(...args: string[]): string;
        public get_reference_object(row: any, property: Ground.Property): any;
        public has_expansion(path: string): boolean;
        public process_row(row: any): Promise;
        public query_link_property(seed: any, property: any): Promise;
        public process_property_filter(filter: any): Internal_Query_Source;
        public process_property_filters(): Internal_Query_Source;
        public extend(source: External_Query_Source): void;
        public run_core(): Promise;
        public run(): Promise;
        static get_identity_sql(property: Ground.Property, cross_property?: Ground.Property): string;
        static generate_join(property: Ground.Property, cross_property?: Ground.Property): string;
        static query_path(path: string, args: any[], ground: Ground.Core): Promise;
        static follow_path(path: any, args: any[], ground: Ground.Core): string;
        private static process_tokens(tokens, args, ground);
    }
}
declare var uuid: any;
declare module Ground {
    interface IUser {
        id: any;
    }
    class Update implements Ground.IUpdate {
        public seed: Ground.ISeed;
        private fields;
        public override: boolean;
        public trellis: Ground.Trellis;
        public main_table: string;
        public ground: Ground.Core;
        public db: Ground.Database;
        public user: IUser;
        public log_queries: boolean;
        public run_stack: any;
        constructor(trellis: Ground.Trellis, seed: Ground.ISeed, ground?: Ground.Core);
        public get_access_name(): string;
        private generate_sql(trellis);
        private update_embedded_seed(property, value);
        private update_embedded_seeds(core_properties);
        private create_record(trellis);
        private update_record(trellis, id, key_condition);
        private apply_insert(property, value);
        public is_create_property(property: Ground.Property): boolean;
        private get_field_value(property, seed);
        private is_update_property(property);
        private update_links(trellis, id, create?);
        private update_many_to_many(property, create?);
        private update_one_to_many(property);
        private update_reference(property, id);
        private update_reference_object(other, property);
        public run(): Promise;
    }
}
declare module Ground {
    class Delete implements Ground.IUpdate {
        public ground: Ground.Core;
        public trellis: Ground.Trellis;
        public seed: any;
        public max_depth: number;
        constructor(ground: Ground.Core, trellis: Ground.Trellis, seed: Ground.ISeed);
        public get_access_name(): string;
        private delete_child(link, id, depth?);
        private delete_children(trellis, id, depth?);
        public delete_record(trellis: Ground.Trellis, id: any): Promise;
        private get_child_links(trellis);
        public run(depth?: number): Promise;
        private run_delete(trellis, seed, depth?);
    }
}
declare module Ground {
    interface IProperty_Source {
        name?: string;
        type: string;
        insert?: string;
        is_virtual?: boolean;
        is_readonly?: boolean;
        is_private?: boolean;
        property?: string;
        trellis?: string;
    }
    interface ITrellis_Source {
        plural: string;
        parent: string;
        name: string;
        primary_key: string;
        properties: IProperty_Source[];
        is_virtual: boolean;
    }
    interface ISeed {
        _deleted?: any;
    }
    interface IUpdate {
        run: () => Promise;
        get_access_name(): string;
    }
    function path_to_array(path: any): any;
    class Property_Type {
        public name: string;
        public property_class: any;
        public field_type: any;
        public default_value: any;
        public parent: Property_Type;
        public db: Ground.Database;
        public allow_null: boolean;
        constructor(name: string, info: any, types: Property_Type[]);
        public get_field_type(): any;
    }
    class Core extends MetaHub.Meta_Object {
        public trellises: Ground.Trellis[];
        public tables: Ground.Table[];
        public views: any[];
        public property_types: Property_Type[];
        public db: Ground.Database;
        public log_queries: boolean;
        public log_updates: boolean;
        constructor(config: any, db_name: string);
        public add_trellis(name: string, source: ITrellis_Source, initialize_parent?: boolean): Ground.Trellis;
        public get_base_property_type(type: any): any;
        public convert_value(value: any, type: any): any;
        public create_query(trellis_name: string, base_path?: string): Ground.Query_Builder;
        public create_update(trellis: any, seed?: ISeed, user?: Ground.IUser): IUpdate;
        public delete_object(trellis: Ground.Trellis, seed: ISeed): Promise;
        public initialize_trellises(subset: Ground.Trellis[], all?: any): void;
        public insert_object(trellis: any, seed?: ISeed, user?: Ground.IUser, as_service?: boolean): Promise;
        static is_private(property: Ground.Property): boolean;
        static is_private_or_readonly(property: Ground.Property): boolean;
        public update_object(trellis: any, seed?: ISeed, user?: Ground.IUser, as_service?: boolean): Promise;
        static load_json_from_file(filename: string): any;
        public load_property_types(filename: string): void;
        public load_schema_from_file(filename: string): void;
        public load_tables(tables: any[]): void;
        public load_trellises(trellises: ITrellis_Source[]): Ground.Trellis[];
        private parse_schema(data);
        static remove_fields(object: any, trellis: Ground.Trellis, filter: any): any;
        public sanitize_trellis_argument(trellis: any): Ground.Trellis;
        static to_bool(input: any): boolean;
    }
}
declare module Ground {
    interface IField {
        relationship?: string;
        name: string;
        share?: string;
        other_table?: string;
    }
    class Table {
        public name: string;
        public properties: {};
        public indexes: any[];
        public ground: Ground.Core;
        public db_name: string;
        public trellis: Ground.Trellis;
        public primary_keys: any[];
        public query: string;
        constructor(name: string, ground: Ground.Core);
        public connect_trellis(trellis: Ground.Trellis): void;
        static create_from_trellis(trellis: Ground.Trellis, ground?: Ground.Core): Table;
        public create_sql(ground: Ground.Core): string;
        static create_sql_from_array(table_name: string, source: any[], primary_keys?: any[], indexes?: any[]): string;
        public create_sql_from_trellis(trellis: Ground.Trellis): string;
        private get_primary_keys(trellis);
        static format_value(value: any): any;
        static generate_index_sql(index: any): string;
        public load_from_schema(source: any): void;
    }
}
declare module Ground {
    interface Identity {
        name: string;
        trellis: Ground.Trellis;
        keys: Identity_Key[];
    }
    interface Identity_Key {
        name: string;
        type: string;
        property: Ground.Property;
    }
    class Link_Trellis implements Ground.ITrellis {
        public properties: any;
        public seed: any;
        public table_name: string;
        public trellises: Ground.Trellis[];
        public trellis_dictionary: {};
        public identities: Identity[];
        constructor(trellises: Ground.Trellis[], table_name?: string);
        public create_identity(trellis: Ground.Trellis): Identity;
        static create_from_property(property: Ground.Property): Link_Trellis;
        static create_reference(property: Ground.Property, name: string): Identity_Key;
        public generate_join(seeds: {}): string;
        public generate_delete_row(seeds: any[]): string;
        public generate_insert(seeds: any): string;
        private generate_table_name();
        public get_key_condition(key: Identity_Key, seed: any, fill_blanks?: boolean): string;
        public get_condition_string(seeds: any): string;
        public get_identity_conditions(identity: Identity, seed: any, fill_blanks?: boolean): any[];
        public get_conditions(seeds: any): string[];
        public get_identity_by_trellis(trellis: Ground.Trellis): Identity;
    }
}
declare module Ground {
    enum Relationships {
        none = 0,
        one_to_one = 1,
        one_to_many = 2,
        many_to_many = 3,
    }
    class Property {
        public name: string;
        public parent: Ground.Trellis;
        public type: string;
        public insert: string;
        public other_property: string;
        public "default": any;
        public other_trellis: Ground.Trellis;
        public other_trellis_name: string;
        public is_private: boolean;
        public is_readonly: boolean;
        public is_virtual: boolean;
        public is_composite_sub: boolean;
        public is_unique: boolean;
        public composite_properties: any[];
        public access: string;
        public allow_null: boolean;
        constructor(name: string, source: Ground.IProperty_Source, trellis: Ground.Trellis);
        public initialize_composite_reference(other_trellis: Ground.Trellis): void;
        public fullname(): string;
        public get_allow_null(): boolean;
        public get_composite(): Property[];
        public get_data(): Ground.IProperty_Source;
        public get_default(): any;
        public get_field_name(): string;
        public get_field_override(create_if_missing?: boolean): Ground.IField;
        public get_field_type(): any;
        public get_seed_name(): string;
        public get_sql_value(value: any, type?: any, is_reference?: boolean): any;
        public get_type(): string;
        public get_other_id(entity: any): any;
        public get_other_property(create_if_none?: boolean): Property;
        public get_property_type(): Ground.Property_Type;
        public get_referenced_trellis(): Ground.Trellis;
        public get_relationship(): Relationships;
        public get_field_query(): string;
        public query(): string;
    }
}
declare module Ground {
    interface IPager {
        limit?: any;
        offset?: any;
    }
    interface Query_Filter {
        property: Ground.Property;
        value: any;
        operator: string;
    }
    interface Query_Sort {
        property: any;
        dir?: any;
    }
    interface Query_Transform {
        clause: string;
    }
    class Query_Builder {
        public ground: Ground.Core;
        public trellis: Ground.Trellis;
        public pager: IPager;
        public type: string;
        public properties: any;
        public sorts: Query_Sort[];
        public source: Ground.External_Query_Source;
        public include_links: boolean;
        public transforms: Query_Transform[];
        public subqueries: {};
        static operators: {
            '=': any;
            'LIKE': {
                "render": (result: any, filter: any, property: any, data: any) => void;
            };
            '!=': any;
        };
        public filters: Query_Filter[];
        constructor(trellis: Ground.Trellis);
        static add_operator(symbol: string, action: any): void;
        public add_filter(property_name: string, value?: any, operator?: string): void;
        public add_key_filter(value: any): void;
        public add_sort(sort: Query_Sort): void;
        public add_subquery(property_name: string, source?: any): Query_Builder;
        public add_transform_clause(clause: string): void;
        public create_runner(): Ground.Query_Runner;
        static create_join_filter(property: Ground.Property, seed: any): Query_Filter;
        public extend(source: Ground.External_Query_Source): void;
        public get_primary_key_value(): any;
        public run(): Promise;
        public run_single(): Promise;
    }
}
declare module Ground {
    class Query_Renderer {
        public ground: Ground.Core;
        static counter: number;
        constructor(ground: Ground.Core);
        static get_properties(source: Ground.Query_Builder): {};
        static generate_property_join(property: Ground.Property, seeds: any): string;
        public generate_sql(source: Ground.Query_Builder): string;
        private static get_fields_and_joins(source, properties, include_primary_key?);
        private static process_property_filter(source, filter, ground);
        static process_property_filters(source: Ground.Query_Builder, ground: Ground.Core): Ground.Internal_Query_Source;
        static process_sorts(sorts: Ground.Query_Sort[], trellis: Ground.Trellis): string;
        static render_pager(pager: Ground.IPager): string;
    }
}
declare module Ground {
    class Query_Runner {
        public source: Ground.Query_Builder;
        public run_stack: any;
        private row_cache;
        public ground: Ground.Core;
        public renderer: Ground.Query_Renderer;
        constructor(source: Ground.Query_Builder);
        private static generate_property_join(property, seeds);
        private static create_sub_query(trellis, property, source);
        private static get_many_list(seed, property, relationship, source);
        private static get_path(...args);
        private static get_reference_object(row, property, source);
        public process_row(row: any, source: Ground.Query_Builder): Promise;
        public query_link_property(seed: any, property: any, source: Ground.Query_Builder): Promise;
        public run_core(): Promise;
        public run(): Promise;
        public run_single(): Promise;
    }
}
declare module "ground" {
  export = Ground
}