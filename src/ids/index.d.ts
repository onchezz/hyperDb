export type IdGenerator = () => string

export declare const uuidv4: () => string
export declare const setIdGenerator: (generator: IdGenerator) => void
export declare const useUuidV4IdGenerator: () => void

