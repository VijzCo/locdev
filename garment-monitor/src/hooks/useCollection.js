// src/hooks/useCollection.js
import { useEffect, useRef, useState } from "react";
import { watch } from "../firebase/db.js";

/**
 * Live subscription to a collection.
 * @param {string} col
 * @param {Array} constraints  e.g. [where("date","==",d)]  (memoize via deps!)
 * @param {Array} deps         re-subscribe when these change
 */
export function useCollection(col, constraints = [], deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const cRef = useRef(constraints);
  cRef.current = constraints;

  useEffect(() => {
    setLoading(true);
    const unsub = watch(col, cRef.current, (rows) => {
      setData(rows);
      setLoading(false);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col, ...deps]);

  return { data, loading };
}
