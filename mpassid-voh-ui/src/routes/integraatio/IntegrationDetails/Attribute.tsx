import type { Components } from "@/api";
import type { PropsWithChildren } from "react";
import { cloneElement } from "react";
import { DataRowBase, tooltips, typeComponents } from "./DataRow";
import { useIntl } from "react-intl";

export function AttributeRowContainer({
  children,
  configurationEntity,
  name,
  type = "text",
}: PropsWithChildren<Props>) {
  const value = configurationEntity.attributes?.find(
    (attribute) => attribute.name === name
  )?.content as any;

  const intl = useIntl();
  const id = `attribuutti.${name}`;
  const label = id in intl.messages ? { id } : undefined;

  const tooltip = tooltips[name as keyof typeof tooltips];

  const TypeComponent =
    typeof type === "function" ? type : typeComponents[type];

  return cloneElement(
    children as React.ReactElement,
    {
      name,
      label,
      tooltip,
    },
    <TypeComponent value={value} />
  );
}

interface Props {
  configurationEntity: Components.Schemas.ConfigurationEntity;
  name: string;
  type?:
    | keyof typeof typeComponents
    | (({ value }: { value: any }) => JSX.Element);
}

export function Attribute(props: Props) {
  return (
    <AttributeRowContainer {...props}>
      <DataRowBase />
    </AttributeRowContainer>
  );
}
