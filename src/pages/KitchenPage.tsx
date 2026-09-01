import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addDays } from 'date-fns'
import { Bot, ChefHat, Clock3, CookingPot, ExternalLink, Plus, Salad, ShoppingBasket, Sparkles, Trash2 } from 'lucide-react'
import { db } from '../data/db'
import { buildChatGPTPrompt, dishStats, effectiveFreshState, matchDishes } from '../domain/kitchen'
import { inferredMealType, localMealDate, mealGoalProgress, mealGoalSummary, mealTypeLabels } from '../domain/meals'
import type { Dish, FreshItem } from '../domain/types'
import { useToast } from '../components/toast-context'
import { Button, Card, Chip, EmptyState, Modal, SectionHeader } from '../components/ui'
import { DishModal, FreshBatchModal, MealGoalsModal, MealLogModal } from '../components/ActionModals'

export function KitchenPage() {
  const fresh = useLiveQuery(() => db.freshItems.orderBy('addedAt').reverse().toArray(), []) ?? []
  const dishes = useLiveQuery(() => db.dishes.orderBy('updatedAt').reverse().toArray(), []) ?? []
  const meals = useLiveQuery(() => db.mealLogs.toArray(), []) ?? []
  const mealGoals = useLiveQuery(() => db.mealGoals.toArray(), []) ?? []
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const [addFresh, setAddFresh] = useState(false)
  const [addDish, setAddDish] = useState(false)
  const [mealDish, setMealDish] = useState<string | null | undefined>(undefined)
  const [promptItem, setPromptItem] = useState<FreshItem | null | undefined>(undefined)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const { notify } = useToast()
  const active = fresh.filter((item) => item.state !== 'removed')
  const soon = active.filter((item) => effectiveFreshState(item, new Date()) === 'use_soon')
  const recent = active.filter((item) => effectiveFreshState(item, new Date()) === 'recent')
  const matches = useMemo(() => matchDishes(dishes, fresh), [dishes, fresh])
  const goalRows = mealGoalProgress(mealGoals, meals, localMealDate(new Date()))
  const goalSummary = mealGoalSummary(mealGoals, meals, localMealDate(new Date()))
  const suggestedMeal = inferredMealType()
  if (!settings) return null

  const keep = async (item: FreshItem) => {
    await db.freshItems.update(item.id, { state: 'recent', attentionAt: addDays(new Date(), settings.freshItemAttentionDays).toISOString() })
    notify(`${item.name} will wait another ${settings.freshItemAttentionDays} days.`)
  }
  const remove = async (item: FreshItem) => {
    await db.freshItems.update(item.id, { state: 'removed', removedAt: new Date().toISOString() })
    notify(`${item.name} removed from the Fresh List.`)
  }
  const copyAndOpen = async () => {
    const prompt = buildChatGPTPrompt(fresh, dishes, new Date(), promptItem ?? undefined)
    const chat = window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer')
    try { await navigator.clipboard.writeText(prompt); notify('Cooking prompt copied. Paste it into ChatGPT.') }
    catch { notify('Could not copy automatically. Select the prompt text and copy it.') }
    if (!chat) notify('Prompt ready. Your browser blocked the new ChatGPT tab.')
    setPromptItem(undefined)
  }

  return <main className="page">
    <p className="eyebrow">Less waste, fewer decisions</p>
    <h1 className="page-title">Kitchen</h1>
    <p className="page-intro">Remember only the fresh things worth using. Staples and exact quantities can stay out of the app.</p>
    <div className="quick-grid">
      <button className="quick-action" onClick={() => setAddFresh(true)}><ShoppingBasket size={22} />Add groceries</button>
      <button className="quick-action" onClick={() => setMealDish(null)}><Salad size={22} />{suggestedMeal === 'other' ? 'Log home meal' : `Log ${mealTypeLabels[suggestedMeal].toLowerCase()}`}</button>
      <button className="quick-action" onClick={() => setAddDish(true)}><Plus size={22} />Add dish</button>
      <button className="quick-action" onClick={() => setPromptItem(null)}><Bot size={22} />Ask ChatGPT</button>
    </div>

    <SectionHeader eyebrow="Two easy promises" title="Eat at home. Use fresh food." />
    <div className="kitchen-mandates">
      <Card className="mandate-card meal-mandate"><div className="mandate-head"><span className="mandate-icon"><Salad size={20} /></span><div><p className="eyebrow">Meal commitments</p><h2>{goalSummary.completed} / {goalSummary.planned}</h2></div><button className="link-button" onClick={() => setGoalsOpen(true)}>Adjust</button></div>
        <div className="meal-goal-rows">{goalRows.map((row) => <div className="meal-goal-row" key={row.goal.id}><div><strong>{row.goal.label}</strong><span>{row.todayLogged ? 'Today counted' : `${row.remaining} remaining`}</span></div><div className="meal-goal-meter"><span style={{ width: `${row.target ? Math.min(100, row.completed / row.target * 100) : 100}%` }} /></div><strong>{row.completed}/{row.target}</strong></div>)}</div>
        <Button className="button-small" onClick={() => setMealDish(null)}>Log a meal</Button>
      </Card>
      <Card className="mandate-card fresh-mandate"><div className="mandate-head"><span className="mandate-icon"><ShoppingBasket size={20} /></span><div><p className="eyebrow">Fresh food</p><h2>{active.length} remembered</h2></div></div><p className="subtle">{soon.length ? `${soon.length} ${soon.length === 1 ? 'item is' : 'items are'} ready for a decision.` : 'Nothing needs attention yet. Add a grocery trip in one batch.'}</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Button className="button-small" variant="secondary" onClick={() => setAddFresh(true)}>Add groceries</Button>{soon.length > 0 && <Button className="button-small" variant="ghost" onClick={() => document.getElementById('use-soon')?.scrollIntoView({ behavior: 'smooth' })}>Review soon</Button>}</div></Card>
    </div>

    <div id="use-soon"><SectionHeader eyebrow="Use soon" title={soon.length ? `${soon.length} ${soon.length === 1 ? 'item needs' : 'items need'} attention` : 'Nothing is demanding attention'} /></div>
    {soon.length ? <div className="list">{soon.map((item) => <Card key={item.id} className="waiting-card"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><Chip tone="yellow">Use soon</Chip><h3 style={{ margin: '10px 0 4px' }}>{item.name}</h3><p className="subtle">Added {new Date(item.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}. This is a planning prompt, not food-safety advice.</p></div><Clock3 size={22} /></div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><Button className="button-small" onClick={() => { const match = matches.find((entry) => entry.dish.ingredients.some((ingredient) => ingredient.normalizedName === item.normalizedName)); setMealDish(match?.dish.id ?? null) }}>Cook it</Button><Button className="button-small" variant="secondary" onClick={() => keep(item)}>Keep it</Button><Button className="button-small" variant="ghost" onClick={() => remove(item)}>Remove</Button><Button className="button-small" variant="ghost" onClick={() => setPromptItem(item)}><Sparkles size={14} style={{ display: 'inline', marginRight: 4 }} />Ideas</Button></div></Card>)}</div> : <EmptyState icon={<Clock3 />} title="Your Fresh List is calm" body="Items appear here after their attention date. It is a nudge to decide, never an expiration warning." />}

    <SectionHeader eyebrow="What can I make?" title="Familiar options first" />
    {matches.length ? <div className="list">{matches.slice(0, 5).map(({ dish, missing, usesSoon, matched }) => <Card className="dish-card" key={dish.id}><Chip tone={usesSoon ? 'yellow' : missing === 0 ? 'green' : 'neutral'}>{usesSoon ? 'Uses something soon' : missing === 0 ? 'Looks ready' : missing === 1 ? 'Missing one listed item' : `${matched} fresh matches`}</Chip><h3>{dish.name}</h3><p>{dish.ingredients.length ? dish.ingredients.map((item) => item.displayName).join(' · ') : 'No key ingredients listed; a familiar option whenever it fits.'}</p><Button className="button-small" style={{ marginTop: 13 }} onClick={() => setMealDish(dish.id)}>Cook this</Button></Card>)}</div> : <EmptyState icon={<ChefHat />} title="Save your first familiar dish" body="A name is enough. Add key fresh ingredients when you want the app to make local matches." />}

    <SectionHeader eyebrow="Fresh List" title={`${active.length} active ${active.length === 1 ? 'item' : 'items'}`} action={<button className="link-button" onClick={() => setAddFresh(true)}>Add more</button>} />
    {active.length ? <div className="ingredient-grid">{[...soon, ...recent].map((item) => <span className="ingredient-pill" key={item.id}>{effectiveFreshState(item, new Date()) === 'use_soon' && <Clock3 size={14} color="#c38c1e" />}{item.name}<button aria-label={`Remove ${item.name}`} onClick={() => remove(item)} style={{ border: 0, background: 'none', padding: 0, display: 'grid', cursor: 'pointer' }}><Trash2 size={13} /></button></span>)}</div> : <EmptyState icon={<ShoppingBasket />} title="The Fresh List is empty" body="Batch-add a grocery trip with commas, semicolons, new lines, or phone dictation." />}

    <SectionHeader eyebrow="Saved dishes" title={`${dishes.length} in your rotation`} action={<button className="link-button" onClick={() => setAddDish(true)}>Add dish</button>} />
    {dishes.length ? <div className="list">{dishes.map((dish) => { const stats = dishStats(dish.id, meals); return <div className="list-row" key={dish.id}><div className="date-badge"><CookingPot size={19} style={{ margin: 'auto' }} /></div><div className="list-row-main"><strong>{dish.name}</strong><p>{stats.timesCooked ? `Cooked ${stats.timesCooked} ${stats.timesCooked === 1 ? 'time' : 'times'}${stats.lastCooked ? ` · last ${new Date(stats.lastCooked).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}` : 'Not logged yet'}{dish.wouldMakeAgain ? ' · Would make again' : ''}</p></div><Button className="button-small" variant="ghost" onClick={() => setMealDish(dish.id)}>Log</Button></div> })}</div> : <EmptyState icon={<CookingPot />} title="No recipes required" body="A Saved Dish is deliberately lightweight: name it now, add ingredients or notes only if useful." />}

    {addFresh && <FreshBatchModal settings={settings} onClose={() => setAddFresh(false)} />}
    {addDish && <DishModal onClose={() => setAddDish(false)} />}
    {mealDish !== undefined && <MealLogModal dishes={dishes} selectedDishId={mealDish} onClose={() => setMealDish(undefined)} />}
    {goalsOpen && <MealGoalsModal goals={mealGoals} onClose={() => setGoalsOpen(false)} />}
    {promptItem !== undefined && <Modal title={promptItem ? `Use ${promptItem.name}` : 'What should I cook?'} onClose={() => setPromptItem(undefined)}><p className="subtle">Steady will copy a prompt containing your active Fresh List and all Saved Dish summaries, then offer ChatGPT in a new tab. Nothing is sent automatically.</p><pre style={{ whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto', padding: 14, borderRadius: 14, background: '#eeece5', fontSize: '.72rem', lineHeight: 1.45 }}>{buildChatGPTPrompt(fresh, dishes, new Date(), promptItem ?? undefined)}</pre><div className="modal-actions"><Button variant="ghost" onClick={() => setPromptItem(undefined)}>Cancel</Button><Button onClick={copyAndOpen}>Copy & open ChatGPT <ExternalLink size={14} style={{ display: 'inline', marginLeft: 5 }} /></Button></div></Modal>}
  </main>
}
