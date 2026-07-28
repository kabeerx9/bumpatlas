import { createLiveActivity } from "expo-widgets";

export type CityWalkActivityProps = {
  currentStop: string;
  etaMinutes: number;
  nextStop: string;
  progress: number;
  status: string;
  step: number;
  title: string;
  totalStops: number;
};

const cityWalkActivityLayout = String.raw`
function CityWalkActivity(props, environment) {
  const brand = environment.isLuminanceReduced ? "#FFFFFF" : "#8EE3C1";
  const text = environment.colorScheme === "dark" ? "#FFFFFF" : "#1C1C1E";
  const secondary = environment.colorScheme === "dark" ? "#D1D5DB" : "#6B7280";
  const progressText = String(Math.round(props.progress)) + "%";

  const banner = jsxs(VStack, {
    alignment: "leading",
    spacing: 8,
    modifiers: [padding({ all: 14 }), activityBackgroundTint("#26215C")],
    children: [
      jsxs(HStack, {
        alignment: "center",
        spacing: 8,
        children: [
          jsx(Image, { systemName: "figure.walk.circle.fill", color: brand, size: 24 }),
          jsxs(VStack, {
            alignment: "leading",
            spacing: 2,
            children: [
              jsx(Text, {
                modifiers: [font({ weight: "bold", size: 16 }), foregroundStyle("#FFFFFF")],
                children: props.title
              }),
              jsx(Text, {
                modifiers: [font({ size: 12 }), foregroundStyle("#D1D5DB")],
                children: props.status
              })
            ]
          }),
          jsx(Spacer, {}),
          jsx(Text, {
            modifiers: [font({ weight: "bold", size: 18 }), foregroundStyle(brand)],
            children: String(props.etaMinutes) + "m"
          })
        ]
      }),
      jsx(Text, {
        modifiers: [font({ size: 13 }), foregroundStyle("#FFFFFF")],
        children: "Now: " + props.currentStop
      }),
      jsx(Text, {
        modifiers: [font({ size: 12 }), foregroundStyle("#D1D5DB")],
        children:
          "Next: " +
          props.nextStop +
          " · stop " +
          String(props.step) +
          " of " +
          String(props.totalStops)
      })
    ]
  });

  return {
    banner: banner,
    compactLeading: jsx(Image, { systemName: "figure.walk", color: brand, size: 18 }),
    compactTrailing: jsx(Text, {
      modifiers: [font({ weight: "semibold", size: 13 }), foregroundStyle(text)],
      children: String(props.etaMinutes) + "m"
    }),
    minimal: jsx(Image, { systemName: "map.circle.fill", color: brand, size: 18 }),
    expandedLeading: jsxs(VStack, {
      alignment: "center",
      spacing: 4,
      modifiers: [padding({ all: 8 })],
      children: [
        jsx(Image, { systemName: "figure.walk.circle.fill", color: brand, size: 28 }),
        jsx(Text, {
          modifiers: [font({ size: 11 }), foregroundStyle(secondary)],
          children: "Walking"
        })
      ]
    }),
    expandedTrailing: jsxs(VStack, {
      alignment: "center",
      spacing: 2,
      modifiers: [padding({ all: 8 })],
      children: [
        jsx(Text, {
          modifiers: [font({ weight: "bold", size: 24 }), foregroundStyle(text)],
          children: String(props.etaMinutes)
        }),
        jsx(Text, {
          modifiers: [font({ size: 11 }), foregroundStyle(secondary)],
          children: "minutes"
        })
      ]
    }),
    expandedCenter: jsxs(VStack, {
      alignment: "center",
      spacing: 3,
      modifiers: [frame({ minWidth: 80 })],
      children: [
        jsx(Text, {
          modifiers: [font({ weight: "semibold", size: 13 }), foregroundStyle(text)],
          children: progressText
        }),
        jsx(Text, {
          modifiers: [font({ size: 11 }), foregroundStyle(secondary)],
          children: "Stop " + String(props.step) + "/" + String(props.totalStops)
        })
      ]
    }),
    expandedBottom: jsxs(VStack, {
      alignment: "leading",
      spacing: 4,
      modifiers: [padding({ all: 12 })],
      children: [
        jsx(Text, {
          modifiers: [font({ weight: "semibold", size: 14 }), foregroundStyle(text)],
          children: props.currentStop
        }),
        jsx(Text, {
          modifiers: [font({ size: 12 }), foregroundStyle(secondary)],
          children: "Next: " + props.nextStop
        })
      ]
    })
  };
}
`;

export default createLiveActivity<CityWalkActivityProps>(
  "CityWalkActivity",
  cityWalkActivityLayout as never,
);
