import { FormattedMessage } from "react-intl";
import { Outlet } from "react-router-dom";
import styled from "styled-components";
import Typography from "@opetushallitus/virkailija-ui-components/Typography";
import useSetDocumentTitle from "@/hooks/useDocumentTitle";

const MainContainer = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  box-sizing: border-box;
  background-color: #ffffff;
`;

const MainHeaderContainer = styled.div`
  flex-direction: row;
  align-items: center;
  padding: 3em 6rem 0 6rem;
  justify-content: space-between;
`;

const ContentContainer = styled.div`
  padding: 4rem 6rem 0 6rem;
  display: block;
  max-width: 100%;
`;

export default function Basic() {
  useSetDocumentTitle();

  return (
    <>
      <MainHeaderContainer>
        <Typography as="h1">
          <FormattedMessage defaultMessage="MPASSid-hallinta" />
        </Typography>
      </MainHeaderContainer>
      <MainContainer>
        <ContentContainer>
          <Outlet />
        </ContentContainer>
      </MainContainer>
    </>
  );
}
