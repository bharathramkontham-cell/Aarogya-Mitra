import { styled, css } from 'styled-components';

export const BookmarkSVG = styled.svg`
  width: 24px;
  height: 24px;
  color: #888;
`;

interface BookmarkFillProps {
  $active?: boolean;
}

export const BookmarkFill = styled(BookmarkSVG)<BookmarkFillProps>`
  ${({ $active }) =>
    $active
      ? css`
          fill: #ef4444;
        `
      : css`
          fill: none;
          stroke: #475569;
        `}
`;

export const BookmarkNoEvents = styled(BookmarkFill)<{ $active?: boolean }>`
  ${({ $active }) =>
    $active
      ? css`
          stroke: #ef4444;
        `
      : css`
          stroke: #94a3b8;
        `}
`;
