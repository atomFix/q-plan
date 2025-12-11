import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Users, Folder } from 'lucide-react';
import { Group, RelationResponse } from '../types';

interface OrgTreeProps {
  data: RelationResponse | Group;
  onSelect: (name: string) => void;
  selectedPath: string;
}

const OrgNode: React.FC<{ 
  node: Group | RelationResponse; 
  onSelect: (name: string) => void;
  depth: number;
  selectedPath: string;
}> = ({ node, onSelect, depth, selectedPath }) => {
  const [isOpen, setIsOpen] = useState(depth < 2); // Default open top levels
  const hasChildren = (node.groups && node.groups.length > 0) || (node.employees && node.employees.length > 0);
  const isSelected = selectedPath === node.name;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.name);
  };

  return (
    <div className="select-none">
      <div 
        className={`
          flex items-center py-1 px-2 cursor-pointer transition-colors rounded
          ${isSelected ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-slate-100 text-slate-700'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleSelect}
      >
        <div onClick={handleToggle} className="mr-1 p-0.5 rounded hover:bg-slate-200 text-slate-400">
           {hasChildren ? (
             isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
           ) : <span className="w-3.5 inline-block" />}
        </div>
        
        {depth === 0 ? <Users size={16} className="mr-2 text-slate-500" /> : <Folder size={16} className="mr-2 text-slate-400" />}
        <span className="text-sm truncate">{node.name}</span>
      </div>

      {isOpen && hasChildren && (
        <div>
          {node.groups.map((group, idx) => (
            <OrgNode 
              key={`${group.name}-${idx}`} 
              node={group} 
              onSelect={onSelect} 
              depth={depth + 1}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const OrgTree: React.FC<OrgTreeProps> = ({ data, onSelect, selectedPath }) => {
  return (
    <div className="py-2">
      <OrgNode node={data} onSelect={onSelect} depth={0} selectedPath={selectedPath} />
    </div>
  );
};