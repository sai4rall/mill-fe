import { useEffect, useState } from 'react'

/**
 * Turns a Blob into an object URL for <img src>, revoking it when the blob changes or the component unmounts.
 * Images behind auth are fetched as blobs because <img src> cannot send the Authorization header.
 */
export function useObjectUrl(blob) {
  const [entry, setEntry] = useState(null)
  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    setEntry({ blob, url }) // eslint-disable-line react-hooks/set-state-in-effect
    return () => URL.revokeObjectURL(url)
  }, [blob])
  return blob && entry?.blob === blob ? entry.url : null
}
