import { DownOutlined, SearchOutlined } from '@ant-design/icons';
import Fetch from '@core/fetch';
import { useDrawingStore } from '@core/store/useDrawing';
import type { ColorItem } from '@zeroDraw/api-contract';
import { useRequest } from '@zeroDraw/common';
import { Empty, Input, Popover, Select, Skeleton } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import {
  AssetSection,
  AssetType,
  ColorGrid,
  ColorSwatch,
  Controls,
  EmptyCard,
  EmptyTitle,
  filterText,
  ImageCard,
  ImageGrid,
  PaletteCard,
  PaletteColor,
  PaletteColors,
  PaletteList,
  PaletteName,
  PromptCard,
  PromptContent,
  PromptList,
  PromptTitle,
  Section,
  Toolbar,
  Wrapper,
} from './components/AssetPanel';
import ColorDetailPopover from './components/ColorDetailPopover';
import SaveColorDialog from './components/SaveColorDialog';

const Assets = () => {
  const { t } = useTranslation();
  const { projectId, setFillColor } = useDrawingStore(
    useShallow((s) => ({ projectId: s.currentProjectId, setFillColor: s.setFillColor }))
  );
  const [qurery, setQuery] = useState({
    name: '',
    type: AssetType.All,
  });
  const [saveColorOpen, setSaveColorOpen] = useState(false);
  const [detailColorId, setDetailColorId] = useState<string | null>(null);
  const [editingColor, setEditingColor] = useState<ColorItem | null>(null);

  const { data, loading, mutate } = useRequest(
    () =>
      Fetch.getAssetList({
        projectId: qurery.type === AssetType.Project ? projectId || undefined : undefined,
      }),
    {
      refreshDeps: [qurery.type],
    }
  );

  const { run: createColor, loading: creatingColor } = useRequest(Fetch.createAssetColor, {
    manual: true,
    onSuccess: (color) => {
      mutate((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          colors: {
            ...prev.colors,
            list: [color, ...prev.colors.list],
            total: prev.colors.total + 1,
          },
        };
      });
      setSaveColorOpen(false);
    },
  });

  const { run: updateColor, loading: updatingColor } = useRequest(Fetch.updateAssetColor, {
    manual: true,
    onSuccess: (color) => {
      mutate((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          colors: {
            ...prev.colors,
            list: prev.colors.list.map((item) => (item.id === color.id ? color : item)),
          },
        };
      });
      setEditingColor(null);
      setDetailColorId(null);
    },
  });

  const { run: deleteColor } = useRequest(Fetch.deleteAssetColor, {
    manual: true,
    onSuccess: (_, [id]) => {
      mutate((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          colors: {
            ...prev.colors,
            list: prev.colors.list.filter((item) => item.id !== id),
            total: Math.max(0, prev.colors.total - 1),
          },
        };
      });
      setDetailColorId(null);
    },
  });

  const filtered = useMemo(() => {
    const { colors, palettes, images, prompts } = data || {};
    return {
      colors:
        colors?.list.filter(
          (item) => filterText(item.name, qurery.name) || filterText(item.hex, qurery.name)
        ) || [],
      palettes:
        palettes?.list.filter(
          (item) =>
            filterText(item.name, qurery.name) ||
            item.colors.some((color) => filterText(color, qurery.name))
        ) || [],
      images:
        images?.list.filter(
          (item) => filterText(item.name, qurery.name) || filterText(item.url, qurery.name)
        ) || [],
      prompts:
        prompts?.list.filter(
          (item) => filterText(item.title, qurery.name) || filterText(item.content, qurery.name)
        ) || [],
    };
  }, [qurery.name, data]);

  const handleQueryChange = (newQuery: Partial<typeof qurery>) => {
    setQuery({ ...qurery, ...newQuery });
  };

  if (loading) {
    return (
      <Wrapper>
        <Toolbar>
          <Skeleton.Input active block style={{ height: 40 }} />
          <Skeleton.Input active block style={{ height: 46 }} />
        </Toolbar>
        <Section>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Section>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Toolbar>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: 'var(--color-text-secondary)' }} />}
          placeholder={t('assets.searchPlaceholder')}
          value={qurery.name}
          onChange={(event) => handleQueryChange({ name: event.target.value })}
          size="middle"
        />
        <Controls>
          <Select
            value={qurery.type}
            onChange={(value) => handleQueryChange({ type: value as AssetType })}
            options={[
              { label: t('assets.project'), value: AssetType.Project },
              { label: t('assets.all'), value: AssetType.All },
            ]}
            suffixIcon={<DownOutlined />}
            size="middle"
          />
        </Controls>
      </Toolbar>

      <AssetSection
        title={t('assets.colors')}
        addPopoverOpen={saveColorOpen}
        onAddPopoverOpenChange={setSaveColorOpen}
        addPopoverContent={
          <SaveColorDialog
            open={saveColorOpen}
            title={t('assets.saveColorInFile')}
            loading={creatingColor}
            onClose={() => setSaveColorOpen(false)}
            onSave={(hex) =>
              createColor({
                hex,
                projectId: qurery.type === AssetType.Project ? projectId || undefined : undefined,
              })
            }
          />
        }
      >
        {filtered.colors.length ? (
          <ColorGrid>
            {filtered.colors.map((item) => (
              <Popover
                key={item.id}
                arrow={false}
                content={
                  editingColor?.id === item.id ? (
                    <SaveColorDialog
                      open={editingColor.id === item.id}
                      title={t('assets.editColor')}
                      initialColor={editingColor.hex}
                      loading={updatingColor}
                      onClose={() => setEditingColor(null)}
                      onSave={(hex) => updateColor(editingColor.id, { hex })}
                    />
                  ) : (
                    <ColorDetailPopover
                      color={item}
                      onClose={() => setDetailColorId(null)}
                      onEdit={(color) => setEditingColor(color)}
                      onDelete={(color) => deleteColor(color.id)}
                      onUse={(hex) => {
                        setFillColor(hex);
                        setDetailColorId(null);
                      }}
                    />
                  )
                }
                open={detailColorId === item.id || editingColor?.id === item.id}
                placement="rightTop"
                trigger="click"
                styles={{ content: { padding: 0, background: 'transparent' } }}
                onOpenChange={(open) => {
                  setDetailColorId(open ? item.id : null);
                  if (!open) setEditingColor(null);
                }}
              >
                <ColorSwatch title={item.name || item.hex} $color={item.hex} />
              </Popover>
            ))}
          </ColorGrid>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('assets.noColorsYet')} />
        )}
      </AssetSection>

      <AssetSection title={t('assets.colorPalettes')}>
        {filtered.palettes.length ? (
          <PaletteList>
            {filtered.palettes.map((item) => (
              <div key={item.id}>
                <PaletteCard>
                  <PaletteColors>
                    {item.colors.map((color, index) => (
                      <PaletteColor key={`${item.id}-${color}-${index}`} $color={color} />
                    ))}
                  </PaletteColors>
                </PaletteCard>
                <PaletteName>{item.name}</PaletteName>
              </div>
            ))}
          </PaletteList>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('assets.noPalettesYet')} />
        )}
      </AssetSection>

      <AssetSection title={t('assets.images')}>
        {filtered.images.length ? (
          <ImageGrid>
            {filtered.images.map((item) => (
              <ImageCard key={item.id} title={item.name}>
                <img src={item.url} alt={item.name} />
              </ImageCard>
            ))}
          </ImageGrid>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('assets.noImagesYet')} />
        )}
      </AssetSection>

      <AssetSection title={t('assets.prompts')}>
        {filtered.prompts.length ? (
          <PromptList>
            {filtered.prompts.map((item) => (
              <PromptCard key={item.id}>
                <PromptTitle>{item.title}</PromptTitle>
                <PromptContent>{item.content}</PromptContent>
              </PromptCard>
            ))}
          </PromptList>
        ) : (
          <EmptyCard>
            <EmptyTitle>{t('assets.noPromptsYet')}</EmptyTitle>
            {t('assets.savePromptSnippets')}
          </EmptyCard>
        )}
      </AssetSection>

      <AssetSection title={t('assets.collections')}>
        <EmptyCard>
          <EmptyTitle>{t('assets.noCollectionsYet')}</EmptyTitle>
          {t('assets.createCollectionsHint')}
        </EmptyCard>
      </AssetSection>
    </Wrapper>
  );
};

export default Assets;
