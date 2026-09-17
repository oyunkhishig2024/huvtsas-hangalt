import React from 'react';
import { Shield, Printer, X, Download, CheckCircle } from 'lucide-react';
import { DistributionRecord, UniformItem, Personnel } from '../types';
import { useUniformData } from '../context/UniformDataContext';

interface PrintableVoucherModalProps {
  record: DistributionRecord | null;
  onClose: () => void;
}

export const PrintableVoucherModal: React.FC<PrintableVoucherModalProps> = ({ record, onClose }) => {
  const { uniforms, personnel, language } = useUniformData();

  if (!record) return null;

  const uniform = uniforms.find(u => u.id === record.uniformId);
  const soldier = personnel.find(p => p.id === record.personnelId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-teal-900 border border-teal-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
        {/* Controls bar (Hidden during print) */}
        <div className="flex items-center justify-between pb-3 border-b border-teal-800 print:hidden">
          <div className="flex items-center gap-2 text-sm font-bold text-foam-100">
            <Printer className="w-4 h-4 text-foam-300" />
            {language === 'mn' ? 'Албан ёсны олголтын баримт (Хэвлэх хуудас)' : 'Military Issuance Voucher'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-foam-300 hover:bg-foam-300 text-teal-950 font-bold text-xs shadow transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              {language === 'mn' ? 'Хэвлэх' : 'Print Voucher'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-foam-500 hover:text-foam-100 bg-teal-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Military Slip Canvas */}
        <div 
          id="printable-slip-area" 
          className="bg-white text-teal-900 p-8 rounded-xl border border-foam-200 shadow-inner font-sans space-y-5 print:p-0 print:border-none print:shadow-none"
        >
          {/* Header */}
          <div className="text-center border-b-2 border-teal-900 pb-4">
            <div className="flex justify-center mb-1">
              <div className="w-10 h-10 rounded-full bg-teal-900 text-foam-300 flex items-center justify-center font-bold text-lg">
                ★
              </div>
            </div>
            <h2 className="text-sm font-bold tracking-wider uppercase text-teal-800">
              МОНГОЛ УЛСЫН ЗЭВСЭГТ ХҮЧИН
            </h2>
            <h1 className="text-lg font-extrabold uppercase text-teal-950 mt-0.5">
              ЦЭРГИЙН ДҮРЭМТ ХУВЦАС, ЭД ХАНГАЛТ ОЛГОЛТЫН ХУУДАС
            </h1>
            <p className="text-[11px] text-teal-600 mt-1">
              (Монгол Улсын Ерөнхийлөгчийн 141 дүгээр зарлигт заасан цэргийн албаны хувцаслалтын нормын дагуу)
            </p>
          </div>

          {/* Voucher Reference & Date */}
          <div className="flex justify-between items-center text-xs font-mono border-b border-foam-200 pb-2">
            <div>
              <span className="text-foam-600 font-sans">Баримтын дугаар:</span>{' '}
              <strong className="text-teal-900 text-sm font-bold">{record.distributionNo}</strong>
            </div>
            <div>
              <span className="text-foam-600 font-sans">Олгосон огноо:</span>{' '}
              <strong className="text-teal-900">{record.issueDate}</strong>
            </div>
          </div>

          {/* Personnel Details */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-foam-50 p-3 rounded-lg border border-foam-100">
            <div>
              <div className="text-foam-600">Хүлээн авагч цэргийн албан хаагч:</div>
              <div className="font-bold text-sm text-teal-900 mt-0.5">{record.personnelName}</div>
              <div className="text-teal-600 mt-0.5 font-mono">Цэргийн бүртгэлийн №: {record.personnelMilitaryId}</div>
            </div>
            <div>
              <div className="text-foam-600">Цол ба Салбар анги:</div>
              <div className="font-bold text-teal-900 mt-0.5">{record.personnelRank}</div>
              <div className="text-teal-700 mt-0.5">{record.departmentName}</div>
            </div>
          </div>

          {/* Uniform Specification Table */}
          <table className="w-full text-left text-xs border border-foam-200">
            <thead className="bg-foam-50 border-b border-foam-200 font-bold text-teal-800">
              <tr>
                <th className="p-2 border-r border-foam-200">Загварын код</th>
                <th className="p-2 border-r border-foam-200">Дүрэмт хувцасны нэр</th>
                <th className="p-2 border-r border-foam-200">Pantone код</th>
                <th className="p-2 border-r border-foam-200 text-center">Размер</th>
                <th className="p-2 border-r border-foam-200 text-center">Тоо ширхэг</th>
                <th className="p-2 text-right">Хүчинтэй хугацаа (+1 жил)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foam-100">
              <tr>
                <td className="p-2 font-mono font-bold border-r border-foam-200">{record.uniformModelCode}</td>
                <td className="p-2 font-semibold border-r border-foam-200">{record.uniformNameMn}</td>
                <td className="p-2 font-mono text-[11px] border-r border-foam-200">
                  {uniform?.pantoneColors.map(c => c.code).join(', ') || 'Стандарт'}
                </td>
                <td className="p-2 font-mono font-bold text-center border-r border-foam-200">{record.size}</td>
                <td className="p-2 font-mono text-center border-r border-foam-200">1 ком</td>
                <td className="p-2 font-mono font-bold text-right text-teal-900">{record.expiryDate}</td>
              </tr>
            </tbody>
          </table>

          {/* Lifecycle & Tailoring Regulations */}
          <div className="text-[11px] text-teal-600 leading-normal p-3 bg-foam-50 rounded-lg border border-foam-100 space-y-1">
            <div className="font-bold text-teal-800">Эд хангалтын санамж ба эрх зүйн зохицуулалт:</div>
            <p>
              1. Тус дүрэмт хувцасны эдэлгээний хугацаа олгосон өдрөөс хойш 1 бүтэн жил хүчинтэй байна.
            </p>
            <p>
              2. Размер тохироогүй тохиолдолд хангалт хариуцсан офицерт мэдэгдэж, хэмжээ солих албан ёсны бүртгэл (Exchange Record) үүсгүүлэн шинэчилж болно.
            </p>
            <p>
              3. Дүрэмт хувцсыг бусдад шилжүүлэх, зарах, эвдэж гэмтээхийг хатуу хориглоно.
            </p>
          </div>

          {/* Official Signatures Block */}
          <div className="pt-6 border-t-2 border-dashed border-foam-500 grid grid-cols-2 gap-8 text-xs">
            <div>
              <div className="font-bold text-teal-900">ОЛГОСОН ЭД ХАНГАЛТЫН ОФИЦЕР:</div>
              <div className="mt-8 border-b border-teal-900 pb-1 flex justify-between">
                <span>Гарын үсэг: _________________</span>
                <span>/ {record.issuedByOfficer} /</span>
              </div>
              <div className="text-[10px] text-foam-600 mt-1">Тамга / Тэмдэг</div>
            </div>

            <div>
              <div className="font-bold text-teal-900">ХҮЛЭЭН АВСАН АЛБАН ХААГЧ:</div>
              <div className="mt-8 border-b border-teal-900 pb-1 flex justify-between">
                <span>Гарын үсэг: _________________</span>
                <span>/ {record.personnelName} /</span>
              </div>
              <div className="text-[10px] text-foam-600 mt-1">Огноо: {record.issueDate}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
