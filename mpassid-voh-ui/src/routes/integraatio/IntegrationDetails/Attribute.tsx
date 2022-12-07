import type { Components } from "@/api";
import type { PropsWithChildren } from "react";
import { cloneElement } from "react";
import { DataRowBase, labels, tooltips, typeComponents } from "./DataRow";

export function AttributeRowContainer({
  children,
  configurationEntity,
  name,
  type = "text",
}: PropsWithChildren<Props>) {
  const value = configurationEntity.attributes?.find(
    (attribute) => attribute.name === name
  )?.content as any;
  const label = labels[name as keyof typeof labels];
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
