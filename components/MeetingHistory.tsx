
import React from 'react';
import { MeetingMemo } from '../types';
import { Calendar, ChevronRight, Search, Trash2, ArrowLeft } from 'lucide-react';

interface MeetingHistoryProps {
  memos: MeetingMemo[];
  onSelect: (memo: MeetingMemo) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const MeetingHistory: React.FC<MeetingHistoryProps> = ({ memos, onSelect, onDelete, onBack }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredMemos = memos
    .filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 m.summary.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Meeting History</h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search meetings..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredMemos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">No meetings found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMemos.map((memo) => (
            <div
              key={memo.id}
              className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
              onClick={() => onSelect(memo)}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    {new Date(memo.timestamp).toLocaleDateString()}
                  </span>
                  <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {memo.title}
                  </h3>
                </div>
                <p className="text-gray-500 line-clamp-1 text-sm">{memo.summary}</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(memo.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
                <ChevronRight className="text-gray-300" size={20} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeetingHistory;
