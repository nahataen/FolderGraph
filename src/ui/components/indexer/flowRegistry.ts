import type { EdgeTypes, NodeTypes } from '@xyflow/react';
import { DashedRelationEdge } from '../edges/DashedRelationEdge';
import { StructuralNode } from '../nodes/StructuralNode';

export const structuralNodeTypes: NodeTypes = {
  structuralNode: StructuralNode,
};

export const structuralEdgeTypes: EdgeTypes = {
  dashedRelation: DashedRelationEdge,
};
