import { useFrame, useThree } from "@react-three/fiber"
import { createContext, useContext, useEffect, useRef, type RefObject } from "react"

type DeltaContextType = {
  delta: RefObject<number>
}

const DeltaContext = createContext<DeltaContextType | null>(null);

export function FrameLimiter({ 
  limit = 60, 
  frameloop = 'never',
  children,
}: {
  limit?: number,
  frameloop?: 'demand' | 'never',
  children?: React.ReactNode,
}) {

  const { advance, clock } = useThree()
  const delta = useRef(0)

  useThree((state) => {
    if (state.frameloop !== frameloop) {
      state.set({ frameloop: frameloop })
    }
  })

  useEffect(() => {

    const interval = 1 / limit
    let animationFrameId = 0

    const update = () => {
      animationFrameId = requestAnimationFrame(update)
      
      delta.current += clock.getDelta()

      if (delta.current >= interval) {
        advance(clock.getElapsedTime() * 1000)
        delta.current = delta.current % interval
      }
    }

    update()

    return () => cancelAnimationFrame(animationFrameId)
  }, [limit, advance, clock])

  return (
    <DeltaContext value={{ delta }}>
      {children}
    </DeltaContext>
  )
}

export function useDelta() {
  const context = useContext(DeltaContext);
  if (!context) {
    throw new Error('useDelta must be used within a FrameLimiter');
  }
  return context;
};