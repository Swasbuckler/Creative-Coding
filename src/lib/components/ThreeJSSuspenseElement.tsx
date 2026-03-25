import { Html } from "@react-three/drei";
import { IconLoader2 } from "@tabler/icons-react";

export default function ThreeJSSuspenseElement() {

  return (
    <Html center>
      <div className="h-6 flex flex-row justify-center items-center gap-1 text-base">
        <IconLoader2 className="size-6 animate-spin" />
        <span>Loading...</span>
      </div>
    </Html>
  );
}