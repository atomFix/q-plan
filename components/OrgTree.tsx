import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Users, Folder, FolderOpen } from 'lucide-react';
import { Group, RelationResponse } from '../types';

interface OrgTreeProps {
  data: RelationResponse | Group;
  onSelect: (name: string) => void;
  selectedPath: string;
  parentPath?: string;
}

const OrgNode: React.FC<{
  node: Group | RelationResponse;
  onSelect: (name: string) => void;
  depth: number;
  selectedPath: string;
  parentPath?: string;
}> = ({ node, onSelect, depth, selectedPath, parentPath = '' }) => {
  const hasGroups = node.groups && node.groups.length > 0;

  // Build full path for this node
  const currentPath = parentPath ? `${parentPath},${node.name}` : node.name;
  const isSelected = selectedPath === currentPath;

  // Check if any descendant is selected
  const hasSelectedDescendant = React.useMemo(() => {
    if (!selectedPath) return false;
    if (!selectedPath.startsWith(currentPath)) return false;

    // Check if any direct child group or its descendants contain the selected path
    if (node.groups) {
      return node.groups.some(group => {
        const childPath = `${currentPath},${group.name}`;
        return selectedPath.startsWith(childPath);
      });
    }
    return false;
  }, [selectedPath, currentPath, node.groups]);

  // Auto-expand if this node or any descendant is selected, or if it's a top-level node
  const [isOpen, setIsOpen] = useState(depth < 2 || isSelected || hasSelectedDescendant);

  // Update isOpen when selectedPath changes
  React.useEffect(() => {
    if (isSelected || hasSelectedDescendant) {
      setIsOpen(true);
    }
  }, [isSelected, hasSelectedDescendant]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(currentPath); // Pass full path instead of just name
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-2 px-3 cursor-pointer transition-all rounded-lg relative card-hover ${
          isSelected ? 'bg-blue-600 text-white' : 'text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/50'
        }`}
        style={{
          paddingLeft: `${depth * 12 + 12}px`,
        }}
        onClick={handleSelect}
      >
        {isSelected && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white/90"
          />
        )}

        {hasGroups ? (
          <div
            onClick={handleToggle}
            className={`mr-2 p-0.5 rounded transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${
              isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
             {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        ) : (
          <span className="mr-2 w-4 inline-block" />
        )}

        {depth === 0
          ? <Users
              size={16}
              className={`mr-2 ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}
            />
          : hasGroups
            ? <Folder
                size={16}
                className={`mr-2 ${isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}
              />
            : <FolderOpen
                size={16}
                className={`mr-2 ${isSelected ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`}
              />
        }
        <span className={`text-sm truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>
          {node.name}
        </span>
      </div>

      {isOpen && hasGroups && (
        <div>
          {node.groups.map((group, idx) => (
            <OrgNode
              key={`${group.name}-${idx}`}
              node={group}
              onSelect={onSelect}
              depth={depth + 1}
              selectedPath={selectedPath}
              parentPath={currentPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const OrgTree: React.FC<OrgTreeProps> = ({ data, onSelect, selectedPath, parentPath }) => {
  return (
    <div className="py-2">
      <OrgNode
        node={data}
        onSelect={onSelect}
        depth={0}
        selectedPath={selectedPath}
        parentPath={parentPath}
      />
    </div>
  );
};