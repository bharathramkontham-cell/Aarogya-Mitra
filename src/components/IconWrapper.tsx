import { styled, css } from 'styled-components';

export const IconWrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;

  svg {
    width: 24px;
    height: 24px;
  }
`;

export const Icon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
`;

export const IconHide = css`
  display: none;
`;

export const IconShow = css`
  display: block;

  @media (max-width: 640px) {
    display: inline-flex;
  }
`;

export const IconHideFaster = css`
  display: none;
`;

export const IconShowSlowly = css`
  display: block;

  @media (max-width: 768px) {
    display: inline-flex;
  }
`;
