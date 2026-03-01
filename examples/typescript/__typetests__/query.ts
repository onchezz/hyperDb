import { Collection, Q, type ColumnName, type TableName } from '@nozbe/watermelondb'

const collection: Collection<any> = null as any
const t: TableName<any> = null as any
const c: ColumnName = null as any

// Check that queries don't break
collection.query()
collection.query(Q.where(c, true))
collection.query(Q.and(Q.where(c, true)))
collection.query(Q.or(Q.where(c, true)))
collection.query(Q.on(t, Q.where(c, true)))
collection.query().extend(Q.where(c, true))

// Same as above, but as an array
collection.query([])
collection.query([Q.where(c, true)])
collection.query(Q.and([Q.where(c, true)]))
collection.query(Q.or([Q.where(c, true)]))
collection.query(Q.on(t, [Q.where(c, true)]))
collection.query().extend([Q.where(c, true)])

// readonly arrays are accepted by query helpers
const readonlyWhereList = [Q.where(c, true)] as const
collection.query(readonlyWhereList)
collection.query().extend(readonlyWhereList)
collection.query(Q.and(readonlyWhereList))
collection.query(Q.or(readonlyWhereList))
collection.query(Q.on(t, readonlyWhereList))
