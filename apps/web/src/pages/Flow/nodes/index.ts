import CreateWithAINode from './CreateWithAI';
import ImageNode from './Image';
import LibNode from './Lib';
import SectionNode from './Section';
import TextNode from './Text';

export const nodeTypes = {
  img: ImageNode,
  createWithAI: CreateWithAINode,
  lib: LibNode,
  text: TextNode,
  section: SectionNode,
};
