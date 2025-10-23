/**
 * Turn an array of objects into Map keyed on an object property value that may not be unique within the collection of objects in the array.
 * Convenient for inexing an array for quick access when the key is not distinct within the array.
 * @param rows An array of objects.
 * @param keyCol A property on those objects that you want to map the array elements by.
 * @returns A Map where the keys are the value of a keyCol property and the values are an array of objects that share that value.
 */
export function mapBy<T extends object, U extends keyof T>(rows: T[], keyCol: U): Map<T[U], T[]> {
    return rows.reduce((m, v) => {
        let acc = m.get(v[keyCol]);
        if (!acc) {
            acc = [];
            m.set(v[keyCol], acc);
        }
        acc.push(v);
        return m;
    }, new Map<T[U], T[]>());
}

/**
 * Turn an array of objects into Map keyed on an object property value that may not be unique within the collection of objects in the array.
 * Convenient for inexing an array for quick access when the key is not distinct within the array.
 * @param rows An array of objects.
 * @param keyFn A function that takes an object from the array and returns a value used to map the array elements by.
 * @returns A Map where the keys are the values returned by keyFn when called with each input array element
 * and the values are an array of objects that share that value.
 */
export function mapByKeyFn<T extends object, V>(rows: T[], keyFn: (r: T) => V): Map<V, T[]> {
    return rows.reduce((m, v) => {
        const key = keyFn(v);
        let acc = m.get(key);
        if (!acc) {
            acc = [];
            m.set(key, acc);
        }
        acc.push(v);
        return m;
    }, new Map<V, T[]>());
}

/**
 * Group an array's elements into an array of tuples (kind of like a grouped array chunking).
 * Convenient for processing the groups of elements together or for applying maps/filters/etc. before potentially stuffing into a Map object.
 * @param rows An array of objects.
 * @param keyCol A property on those objects that you want to group the array elements by.
 * @returns An array of 2-element tuples where the first elements of the tuples are the values of the keyCol properties of each input array element
 * and the second elements of the tuples are an array of objects that share that value.
 */
export function groupBy<T extends object, U extends keyof T>(rows: T[], keyCol: U): [T[U], T[]][] {
    return [...mapBy(rows, keyCol).entries()];
}

/**
 * Group an array's elements into an array of tuples (kind of like a grouped array chunking).
 * Convenient for processing the groups of elements together or for applying maps/filters/etc. before potentially stuffing into a Map object.
 * @param rows An array of objects.
 * @param keyFn A function that takes an object from the array and returns a value used to group the array elements by.
 * @returns An array of 2-element tuples where the first elements of the tuples are the values returned by keyFn when called with each input array element
 * and the second elements of the tuples are an array of objects that share that value.
 */
export function groupByKeyFn<T extends object, V>(rows: T[], keyFn: (r: T) => V): [V, T[]][] {
    return [...mapByKeyFn(rows, keyFn).entries()];
}
