import { Composition } from "remotion";
import { Intro } from "./Intro";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Intro"
      component={Intro}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{ background: "#efebe4", lacquer: [0.035, 0.038, 0.042] as [number, number, number] }}
    />
  );
};
