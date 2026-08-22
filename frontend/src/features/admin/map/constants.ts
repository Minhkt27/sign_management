import { NodeType } from '@/shared/types';

export const NODE_TYPE_OPTIONS: { value: NodeType; label: string }[] = [
  { value: 'ROOM',       label: 'Phòng' },
  { value: 'DEPARTMENT', label: 'Khoa' },
  { value: 'JUNCTION',   label: 'Ngã rẽ / Hành lang' },
  { value: 'STAIRS',     label: 'Cầu thang' },
  { value: 'ELEVATOR',   label: 'Thang máy' },
  { value: 'ENTRANCE',   label: 'Lối vào / Ra' },
];

export const CAMPUS_NODE_TYPE_OPTIONS: { value: NodeType; label: string }[] = [
  { value: 'ENTRANCE', label: 'Cổng tòa nhà' },
  { value: 'JUNCTION', label: 'Ngã rẽ / Đường đi' },
];
