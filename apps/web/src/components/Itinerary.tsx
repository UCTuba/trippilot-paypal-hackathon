import { BedDouble, Bus, Check, Clock3, Coffee, Footprints, Utensils } from 'lucide-react'
import type { PlanItem } from '../lib/types'
import { pounds } from '../lib/money'

const typeIcon = {
  stay: BedDouble,
  food: Utensils,
  activity: Footprints,
  rest: Coffee,
  transport: Bus,
}

const dates = ['Fri 14', 'Sat 15', 'Sun 16']

export function Itinerary({ items, detailed = false }: { items: PlanItem[]; detailed?: boolean }) {
  return (
    <div className={detailed ? 'itinerary itinerary-full' : 'itinerary'}>
      {dates.map((date, index) => (
        <section className="itinerary-day" key={date}>
          <div className="day-heading"><span>Day {index + 1}</span><strong>{date}</strong></div>
          <div className="day-events">
            {items.filter((item) => item.day === index + 1).map((item) => {
              const Icon = typeIcon[item.type as keyof typeof typeIcon] ?? Clock3
              return (
                <article className={`event event-${item.type}`} key={item.id}>
                  <div className="event-icon"><Icon size={17} /></div>
                  <div className="event-copy">
                    <div className="event-time">{item.time}</div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    {detailed && <span className="event-price">{pounds(item.cents, true)} total</span>}
                  </div>
                  {item.booked && <span className="booked"><Check size={12} /> Booked</span>}
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

