import styled, { css, type ThemedStyledProps } from 'styled-components';

interface BookmarkItemProps extends ThemedStyledProps<{ $active?: boolean }> {
  $active?: boolean;
}

export const BookmarkItem = styled.div<BookmarkItemProps>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.2s, box-shadow 0.2s;

  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme?.colors?.accent ?? '#ef4444'};
          color: ${theme?.colors?.surface ?? '#ffffff'};
        `
      : css`
          background: transparent;
          color: ${theme?.colors?.text ?? '#1e293b'};
        `}

  svg {
    width: 22px;
    height: 22px;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.5;
  }
`;

export const BookmarkActiveState = styled.span<{ $active?: boolean }>`
  ${({ $active }) =>
    $active
      ? css`
          background: #ef4444;
          color: #ffffff;
        `
      : css`
          background: transparent;
          color: #64748b;
        `}
`;
