import { Headphones, RotateCcw, ShieldCheck } from 'lucide-react';

const ITEMS = [
  { strong: 'Безопасная оплата', span: 'Все платежи защищены', key: 'pay', icon: 'shield' },
  { strong: 'Без скрытых сборов', span: 'Цена, которую вы видите', key: 'fees', icon: 'check' },
  { strong: 'Возврат билетов', span: 'По правилам площадки', key: 'refund', icon: 'refund' },
  { strong: 'Поддержка 24/7', span: 'Ответим в чате и на почте', key: 'support', icon: 'support' },
] as const;

const ICON = {
  shield: (k: string) => <ShieldCheck key={k} className="h-5 w-5" aria-hidden />,
  check: (k: string) => <ShieldCheck key={k} className="h-5 w-5" aria-hidden />,
  refund: (k: string) => <RotateCcw key={k} className="h-5 w-5" aria-hidden />,
  support: (k: string) => <Headphones key={k} className="h-5 w-5" aria-hidden />,
} as const;

/** Trust-полоса нового шаблона (общая для главной / PDP события). */
export function V2Trust() {
  return (
    <section className="trust">
      <div className="container trust__grid">
        {ITEMS.map((item) => (
          <div key={item.key} className="trust__item">
            <div className="trust__icon">{ICON[item.icon](item.key)}</div>
            <div><strong>{item.strong}</strong><span>{item.span}</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}