import FontAwesome from "@expo/vector-icons/FontAwesome";

import { layout } from "@/design-system";

type FontAwesomeProps = React.ComponentProps<typeof FontAwesome>;

export const TabBarIcon = (props: {
  name: FontAwesomeProps["name"];
  color: FontAwesomeProps["color"];
}) => {
  return <FontAwesome size={layout.icon.tab} style={{ marginBottom: -3 }} {...props} />;
};
