export type State = Record<string, any>;
export type Getters<S extends State = State> = Record<string, (state: S) => any>;
export type Actions = Record<string, (...args: any[]) => any>;

export interface Mutation {
    t: number;
    store: string;
    action: string;
    changes: { key: string; old: any; new: any }[];
}

export type WatchOptions<T> = {
    immediate?: boolean;
    deep?: boolean;
    equals?: (a: T, b: T) => boolean;
};

export type WatchCallback<T> = (next: T, prev: T, mutation: Mutation) => void;

export type GameStore<
    S extends State = State,
    G extends Getters<S> = Getters<S>,
    A extends Actions = Actions
> =
    // Base APIs
    {
        $state: S;
        $reset: () => void;
        $subscribe: (cb: (mutation: Mutation) => void) => () => void;
        $watch: <T>(selector: (store: GameStore<S, G, A>) => T, cb: WatchCallback<T>, options?: WatchOptions<T>) => () => void;
        $track: <T>(selector: (store: GameStore<S, G, A>) => T) => { value: T; deps: string[] };
    }
    // State is available directly on the store as properties
    & S
    // Getters become computed properties on the store
    & { [K in keyof G]: ReturnType<G[K]> }
    // Actions become callable methods on the store
    & { [K in keyof A]: A[K] extends (...args: infer P) => infer R ? (...args: P) => R : never };

export interface StoreDescriptor<S extends State, G extends Getters<S>, A extends Actions> {
    state: () => S;
    // Intersect with `Getters<S>` to ensure contextual typing for getter functions,
    // even when `G` is being inferred.
    getters?: Getters<S> & G;
    actions?: A & ThisType<GameStore<S, G, A>>;
}
