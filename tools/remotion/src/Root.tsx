import { Composition } from "remotion";
import { Intro } from "./Intro";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Phones show the film at ~250 CSS px: the 720 px version is enough and half the weight. */}
      <Composition
        id="Intro720"
        component={Intro}
        durationInFrames={90}
        fps={30}
        width={720}
        height={720}
        defaultProps={{
          background: "#efebe4",
          lacquer: [0.035, 0.038, 0.042] as [number, number, number],
        }}
      />
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{
          background: "#efebe4",
          lacquer: [0.035, 0.038, 0.042] as [number, number, number],
        }}
      />
    </>
  );
};
