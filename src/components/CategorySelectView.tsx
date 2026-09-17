import React, { useMemo } from 'react';
import { Star, Users, Clock3, FileSignature } from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';
import { categoriesForUniform } from './WarehouseView';

interface CategorySelectViewProps {
  onSelectCategory: (categoryFilter: string) => void;
}

export const CategorySelectView: React.FC<CategorySelectViewProps> = ({ onSelectCategory }) => {
  const { uniforms, myHoldings, session } = useUniformData();

  const stockByCategory = useMemo(() => {
    const totals: Record<string, number> = { Officer: 0, Sergeant: 0, Conscript: 0, Contract: 0 };
    myHoldings.forEach(h => {
      const item = uniforms.find(u => u.id === h.uniformId);
      if (!item) return;
      categoriesForUniform(item).forEach(cat => {
        const key = cat === 'Senior Officer' ? 'Officer' : cat;
        if (totals[key] !== undefined) totals[key] += h.quantity;
      });
    });
    return totals;
  }, [myHoldings, uniforms]);

  const cards = [
    {
      key: 'Officer',
      title: 'Офицер',
      subtitle: 'Дээд болон ахлах офицерын хувцас',
      count: stockByCategory.Officer,
      icon: Star
    },
    {
      key: 'Sergeant',
      title: 'Ахлагч',
      subtitle: 'Ахлагчийн бүрэлдэхүүний хувцас',
      count: stockByCategory.Sergeant,
      icon: Users
    },
    {
      key: 'Conscript',
      title: 'Хугацаат цэрэг',
      subtitle: 'Хугацаат алба хаагчийн хувцас',
      count: stockByCategory.Conscript,
      icon: Clock3
    },
    {
      key: 'Contract',
      title: 'Гэрээт цэрэг',
      subtitle: 'Гэрээт алба хаагчийн хувцас',
      count: stockByCategory.Contract,
      icon: FileSignature
    }
  ];

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="text-center mb-8">
        <div className="text-foam-100 font-semibold text-lg">Тавтай морил, {session.displayName}</div>
        <div className="text-foam-600 text-xs mt-1">Агуулахын нөөцийг ангилалаар харах бол сонгоно уу</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              onClick={() => onSelectCategory(card.key)}
              className="flex flex-col items-center gap-3 bg-teal-900 border border-teal-700 hover:border-foam-300 rounded-2xl p-6 transition group"
            >
              <div className="w-14 h-14 rounded-full bg-teal-800 group-hover:bg-foam-300/15 flex items-center justify-center transition">
                <Icon className="w-6 h-6 text-foam-300" />
              </div>
              <div className="text-center">
                <div className="text-foam-100 font-semibold text-sm">{card.title}</div>
                <div className="text-foam-600 text-[11px] mt-0.5">{card.subtitle}</div>
              </div>
              <div className="text-2xl font-bold text-foam-300">{card.count}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
