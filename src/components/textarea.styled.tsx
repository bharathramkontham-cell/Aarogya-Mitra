import { styled, css } from 'styled-components';

export const Textarea = styled.textarea<{ $theme: Record<string, unknown> }>`
  width: 100%;
  min-height: 72px;
  padding: 12px;
  border: 1px solid ${({ theme, $theme }) => (theme && 'colors') ? '' : '#d1d5db'};
  border-radius: 10px;
  background: white;
  font-size: 1rem;
  line-height: 1.5;
  color: #0f172a;
  resize: vertical;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: #0d9488;
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.25);
  }

  &:disabled {
    background: #f1f5f9;
    color: #64748b;
  }
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
`;

export const FieldStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const Caption = styled.p`
  margin-top: 6px;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.45;
`;
