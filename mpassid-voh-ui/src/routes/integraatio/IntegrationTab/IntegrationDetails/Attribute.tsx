import type { Components } from "@/api";
import type { JSX, PropsWithChildren } from "react";
import { cloneElement } from "react";
import { useIntl } from "react-intl";
import type { DataRowProps, ValueComponent } from "../DataRow";
import { DataRowBase, typeComponents } from "../DataRow";

export function AttributeRowContainer({
  children,
  configurationEntity,
  name,
  type = "text",
}: PropsWithChildren<Props>) {
  const value = configurationEntity.attributes?.find(
    (attribute) => attribute.name === name
  )?.content;

  const intl = useIntl();
  const id = `attribuutti.${name}`;
  const tooltipId = `työkaluvihje.${name}`;
  const label = id in intl.messages ? { id } : undefined;
  const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;

  // Each value component expects its own value type; the value at `path`
  // is whatever the integration holds there.
  const TypeComponent = (
    typeof type === "function" ? type : typeComponents[type]
  ) as (props: { value: unknown }) => JSX.Element;

  return cloneElement(
    children as React.ReactElement<DataRowProps>,
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
    | ValueComponent;
}

export function Attribute(props: Props) {
  return (
    <AttributeRowContainer {...props}>
      <DataRowBase />
    </AttributeRowContainer>
  );
}
