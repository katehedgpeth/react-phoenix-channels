import { useDebugValue } from "react"
import { useSyncExternalStore } from "use-sync-external-store/shim"
import { type StoreApi } from "zustand"

type ReadonlyStoreApi<T> = Pick<
  StoreApi<T>,
  "getState" | "getInitialState" | "subscribe"
>

function identity<T>(arg: T): T {
  return arg
}

/**
 * Shim of `useStore` from `zustand`, copied directly from
 * https://github.com/pmndrs/zustand/blob/6759fcbb58fe8a85aa57ad5ce788d60a6b4bc1fb/src/react.ts#L18
 *
 * The native method is only compatible with React 18 because it calls
 * React.useSyncExternalStore.
 */
export function useStore<TState, StateSlice>(
  api: ReadonlyStoreApi<TState>,
  selector: (state: TState) => StateSlice = identity as any,
): StateSlice {
  const slice = useSyncExternalStore(
    api.subscribe,
    () => selector(api.getState()),
    () => selector(api.getInitialState()),
  )
  useDebugValue(slice)
  return slice
}
