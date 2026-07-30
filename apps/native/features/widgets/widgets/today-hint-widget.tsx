import { createWidget } from "expo-widgets";

export type TodayHintWidgetProps = {
  area: string;
  progress: number;
  savedCount: number;
  seed: number;
  subtitle: string;
  title: string;
  updatedAt: string;
};

const todayHintWidgetLayout = String.raw`
function TodayHintWidget(props, environment) {
  const brand = "#211D15";
  const mint = "#F2C878";
  const lavender = "#F8E8C4";
  const muted = "#9A9078";
  const progressText = String(Math.round(props.progress)) + "%";
  const deepLink = "bumpatlas://widgets";

  if (environment.widgetFamily === "accessoryInline") {
    return jsx(Text, {
      modifiers: [font({ weight: "semibold" }), widgetURL(deepLink)],
      children: props.area + ": " + props.title
    });
  }

  if (environment.widgetFamily === "accessoryRectangular") {
    return jsxs(HStack, {
      alignment: "center",
      spacing: 8,
      modifiers: [padding({ all: 4 }), widgetURL(deepLink)],
      children: [
        jsx(Image, { systemName: "sparkles", color: mint, size: 18 }),
        jsxs(VStack, {
          alignment: "leading",
          spacing: 2,
          children: [
            jsx(Text, {
              modifiers: [font({ weight: "semibold", size: 13 })],
              children: props.title
            }),
            jsx(Text, {
              modifiers: [
                font({ size: 11 }),
                foregroundStyle({ type: "hierarchical", style: "secondary" })
              ],
              children: props.area + " · " + progressText
            })
          ]
        })
      ]
    });
  }

  if (environment.widgetFamily === "systemSmall") {
    return jsxs(VStack, {
      alignment: "leading",
      spacing: 8,
      modifiers: [padding({ all: 14 }), background(lavender), widgetURL(deepLink)],
      children: [
        jsxs(HStack, {
          alignment: "center",
          spacing: 6,
          children: [
            jsx(Image, { systemName: "sparkles", color: brand, size: 16 }),
            jsx(Text, {
              modifiers: [font({ weight: "bold", size: 12 }), foregroundStyle(brand)],
              children: "HINTS CITY"
            })
          ]
        }),
        jsx(Spacer, {}),
        jsx(Text, {
          modifiers: [font({ weight: "bold", size: 18 }), foregroundStyle(brand)],
          children: props.title
        }),
        jsx(Text, {
          modifiers: [font({ size: 12 }), foregroundStyle(muted)],
          children: props.area
        }),
        jsx(Button, {
          label: "Cycle",
          target: "cycle-hint",
          onPress: function () {
            return {
              area: props.area,
              progress: props.progress + 12 > 100 ? 12 : props.progress + 12,
              savedCount: props.savedCount + 1,
              seed: props.seed + 1,
              subtitle: "Changed directly from the widget",
              title: "Widget tap " + String(props.seed + 1),
              updatedAt: "Tapped on widget"
            };
          },
          modifiers: [buttonStyle("borderedProminent"), tint(brand)]
        })
      ]
    });
  }

  return jsxs(HStack, {
    alignment: "center",
    spacing: 12,
    modifiers: [padding({ all: 16 }), background("#F4EDDA"), widgetURL(deepLink)],
    children: [
      jsxs(VStack, {
        alignment: "center",
        spacing: 2,
        modifiers: [
          frame({ width: 58, height: 58 }),
          background(mint),
          clipShape("roundedRectangle", 18)
        ],
        children: [
          jsx(Spacer, {}),
          jsx(Image, { systemName: "map.fill", color: brand, size: 20 }),
          jsx(Text, {
            modifiers: [font({ weight: "bold", size: 11 }), foregroundStyle(brand)],
            children: progressText
          }),
          jsx(Spacer, {})
        ]
      }),
      jsxs(VStack, {
        alignment: "leading",
        spacing: 4,
        children: [
          jsx(Text, {
            modifiers: [font({ weight: "bold", size: 18 }), foregroundStyle(brand)],
            children: props.title
          }),
          jsx(Text, {
            modifiers: [font({ size: 13 }), foregroundStyle(muted)],
            children: props.subtitle
          }),
          jsxs(HStack, {
            spacing: 6,
            children: [
              jsx(Text, {
                modifiers: [font({ weight: "semibold", size: 12 }), foregroundStyle("#A96F1F")],
                children: props.area
              }),
              jsx(Text, {
                modifiers: [font({ size: 12 }), foregroundStyle(muted)],
                children: String(props.savedCount) + " saved · " + props.updatedAt
              })
            ]
          })
        ]
      }),
      jsx(Spacer, {})
    ]
  });
}
`;

export default createWidget<TodayHintWidgetProps>(
  "TodayHintWidget",
  todayHintWidgetLayout as never,
);
