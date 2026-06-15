import { NodeType } from '@/shared/types';

export const NODE_TYPE_OPTIONS: { value: NodeType; label: string }[] = [
  { value: 'ROOM',       label: 'Phòng' },
  { value: 'DEPARTMENT', label: 'Khoa' },
  { value: 'JUNCTION',   label: 'Ngã rẽ / Hành lang' },
  { value: 'STAIRS',     label: 'Cầu thang' },
  { value: 'ELEVATOR',   label: 'Thang máy' },
  { value: 'ENTRANCE',   label: 'Lối vào' },
];
