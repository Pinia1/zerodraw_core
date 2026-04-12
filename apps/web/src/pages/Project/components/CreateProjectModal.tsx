import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { Modal, message } from 'antd';
import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { httpUpload } from '../../../services/volc';

const LONG_SIDE = 1920;

export interface RatioOption {
  label: string;
  w: number;
  h: number;
  width: number;
  height: number;
  imageKey?: string;
}

function makeOption(label: string, w: number, h: number): RatioOption {
  const ratio = w / h;
  const isLandscape = ratio >= 1;
  const width = isLandscape ? LONG_SIDE : Math.round(LONG_SIDE * ratio);
  const height = isLandscape ? Math.round(LONG_SIDE / ratio) : LONG_SIDE;
  return { label, w, h, width, height };
}

export const RATIO_OPTIONS: RatioOption[] = [
  makeOption('16 : 9', 16, 9),
  makeOption('21 : 9', 21, 9),
  makeOption('4 : 3', 4, 3),
  makeOption('5 : 4', 5, 4),
  makeOption('1 : 1', 1, 1),
  makeOption('4 : 5', 4, 5),
  makeOption('3 : 4', 3, 4),
  makeOption('9 : 16', 9, 16),
];

// ─── Styles ──────────────────────────────────────────────────────────────────
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 8px 0 4px;
`;

const Card = styled.div<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px 10px;
  border-radius: 10px;
  border: 1.5px solid ${({ $active }) => ($active ? '#6254e8' : 'rgba(255,255,255,0.1)')};
  background: ${({ $active }) => ($active ? 'rgba(98,84,232,0.12)' : 'rgba(255,255,255,0.03)')};
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  &:hover {
    border-color: ${({ $active }) => ($active ? '#6254e8' : 'rgba(255,255,255,0.25)')};
    background: ${({ $active }) => ($active ? 'rgba(98,84,232,0.15)' : 'rgba(255,255,255,0.06)')};
  }
`;

const BOX_W = 56;
const BOX_H = 40;

const PreviewWrap = styled.div`
  width: ${BOX_W}px;
  height: ${BOX_H}px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const Preview = styled.div<{ $w: number; $h: number }>`
  ${({ $w, $h }) => {
    const r = $w / $h;
    // contain 适配：先尝试以宽为准，若高度超出则改以高为准
    let w = BOX_W;
    let h = Math.round(BOX_W / r);
    if (h > BOX_H) {
      h = BOX_H;
      w = Math.round(BOX_H * r);
    }
    return `width: ${w}px; height: ${h}px;`;
  }}
  border-radius: 3px;
  border: 1.5px solid currentColor;
`;

const Label = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #e0e0e0;
  white-space: nowrap;
`;

const Dimension = styled.span`
  font-size: 10px;
  color: #666;
  white-space: nowrap;
`;

const UploadZone = styled.div<{ $active: boolean; $hasImage: boolean }>`
  margin-top: 12px;
  border: 1.5px dashed ${({ $active }) => ($active ? '#6254e8' : 'rgba(255,255,255,0.15)')};
  border-radius: 10px;
  background: ${({ $active }) => ($active ? 'rgba(98,84,232,0.08)' : 'rgba(255,255,255,0.02)')};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: ${({ $hasImage }) => ($hasImage ? '10px 14px' : '14px')};
  transition:
    border-color 0.15s,
    background 0.15s;
  &:hover {
    border-color: ${({ $active }) => ($active ? '#6254e8' : 'rgba(255,255,255,0.3)')};
    background: ${({ $active }) => ($active ? 'rgba(98,84,232,0.12)' : 'rgba(255,255,255,0.05)')};
  }
`;

const UploadThumb = styled.img`
  width: 52px;
  height: 52px;
  object-fit: contain;
  border-radius: 6px;
  background: #111;
  flex-shrink: 0;
`;

const UploadPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 4px 0;
  color: #666;
  font-size: 12px;
`;

const UploadInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  loading?: boolean;
  onConfirm: (option: RatioOption) => void;
  onCancel: () => void;
}

const CreateProjectModal: React.FC<Props> = ({ open, loading, onConfirm, onCancel }) => {
  const [selected, setSelected] = useState<RatioOption>(RATIO_OPTIONS[0]);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    try {
      const { width: imgW, height: imgH, previewUrl } = await readImageFile(file);
      const formData = new FormData();
      formData.append('file', file);
      const s3Key = await httpUpload(formData);

      const ratio = imgW / imgH;
      const isLandscape = ratio >= 1;
      const canvasW = isLandscape ? LONG_SIDE : Math.round(LONG_SIDE * ratio);
      const canvasH = isLandscape ? Math.round(LONG_SIDE / ratio) : LONG_SIDE;

      const customOption: RatioOption = {
        label: 'Custom',
        w: imgW,
        h: imgH,
        width: canvasW,
        height: canvasH,
        imageKey: s3Key,
      };
      setImagePreview(previewUrl);
      setSelected(customOption);
    } catch {
      message.error('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectRatio = (opt: RatioOption) => {
    setSelected(opt);
    setImagePreview(null);
  };

  const handleCancel = () => {
    setImagePreview(null);
    setSelected(RATIO_OPTIONS[0]);
    onCancel();
  };

  const isImageSelected = !!selected.imageKey;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Modal
        open={open}
        title="New File"
        okText="Create"
        cancelText="Cancel"
        onOk={() => onConfirm(selected)}
        onCancel={handleCancel}
        confirmLoading={loading}
        width={480}
        styles={{
          body: { padding: '20px 24px' },
          header: { borderBottom: 'none', paddingBottom: 0 },
          footer: { borderTop: 'none' },
          mask: { backdropFilter: 'blur(2px)' },
        }}
        okButtonProps={{
          style: { background: '#6254e8', borderColor: '#6254e8', borderRadius: 7 },
        }}
        cancelButtonProps={{ style: { borderRadius: 7 } }}
      >
        <Grid>
          {RATIO_OPTIONS.map((opt) => (
            <Card
              key={opt.label}
              $active={!isImageSelected && selected.label === opt.label}
              onClick={() => handleSelectRatio(opt)}
            >
              <PreviewWrap>
                <Preview
                  $w={opt.w}
                  $h={opt.h}
                  style={{
                    color: !isImageSelected && selected.label === opt.label ? '#6254e8' : '#555',
                  }}
                />
              </PreviewWrap>
              <Label>{opt.label}</Label>
              <Dimension>
                {opt.width} × {opt.height}
              </Dimension>
            </Card>
          ))}
        </Grid>

        <UploadZone
          $active={isImageSelected}
          $hasImage={!!imagePreview}
          onClick={handleUploadClick}
        >
          {uploading ? (
            <UploadPlaceholder>
              <LoadingOutlined style={{ fontSize: 20 }} />
              <span>uploading…</span>
            </UploadPlaceholder>
          ) : imagePreview ? (
            <>
              <UploadThumb src={imagePreview} />
              <UploadInfo>
                <Label style={{ color: isImageSelected ? '#a89ff5' : '#ddd' }}>Custom</Label>
                <Dimension>
                  {selected.width} × {selected.height}
                </Dimension>
                <Dimension style={{ color: '#555' }}>Click to reselect</Dimension>
              </UploadInfo>
            </>
          ) : (
            <UploadPlaceholder>
              <PlusOutlined style={{ fontSize: 18 }} />
              <span>Upload image · auto-fit canvas ratio</span>
            </UploadPlaceholder>
          )}
        </UploadZone>
      </Modal>
    </>
  );
};

function readImageFile(file: File): Promise<{ width: number; height: number; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight, previewUrl: url });
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default CreateProjectModal;
