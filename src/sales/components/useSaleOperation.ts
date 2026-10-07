import { useEffect, useRef, useState } from 'react';
import type { SalesApi } from '../api/salesApi';
import { FAILURE_MESSAGE, type ProductType } from '../model/order';
import type { SaleDraft } from '../model/validation';

export interface SaleOperation { key: string; draft: SaleDraft; sagaId?: string }

/** Replaying an uncertain POST always uses the original payload and key. */
export function readSaleOperation(api: SalesApi, operation: SaleOperation, signal: AbortSignal) {
  return operation.sagaId ? api.getSaga(operation.sagaId, signal) :
    api.placeOrder(operation.draft.patientId, operation.draft.productType as ProductType,
      operation.draft.productId, Number(operation.draft.quantity), operation.key, signal);
}

export function useSaleOperation(api: SalesApi, userId: string, onPlaced: (id: string) => void) {
  const storageKey = `opti-sale-operation:${userId}`;
  const [operation, setOperation] = useState<SaleOperation | null>(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as SaleOperation | null;
      return value?.key && value.draft?.patientId && value.draft.productId ? value : null;
    } catch { return null; }
  });
  const [message, setMessage] = useState<string | null>(null);
  const [terminal, setTerminal] = useState(false);
  const inFlight = useRef(Boolean(operation));
  const placed = useRef(onPlaced);
  placed.current = onPlaced;
  function start(draft: SaleDraft) {
    if (inFlight.current) return;
    inFlight.current = true;
    const next = { key: crypto.randomUUID(), draft: { ...draft } };
    sessionStorage.setItem(storageKey, JSON.stringify(next));
    setOperation(next);
  }
  useEffect(() => {
    if (!operation) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current = operation;
    async function check() {
      try {
        const saga = await readSaleOperation(api, current, controller.signal);
        if (controller.signal.aborted) return;
        current = { ...current, sagaId: saga.id };
        sessionStorage.setItem(storageKey, JSON.stringify(current));
        if (saga.status === 'COMPLETED' && saga.orderId) {
          sessionStorage.removeItem(storageKey);
          setTerminal(true);
          placed.current(saga.orderId);
          return;
        }
        if (['FAILED', 'COMPENSATED'].includes(saga.status)) {
          setMessage(saga.failureReason ? FAILURE_MESSAGE[saga.failureReason] : 'No se pudo completar la venta. Consulta las órdenes antes de iniciar otra.');
          sessionStorage.removeItem(storageKey);
          setTerminal(true);
          return;
        }
        setMessage('La venta se está procesando. Estamos consultando su resultado; no la envíes nuevamente.');
      } catch (error) {
        if (controller.signal.aborted) return;
        const info = (error as { info?: { status: number; userMessage: string } }).info;
        if (info && [400, 401, 403, 422].includes(info.status)) {
          setMessage(info.userMessage); setTerminal(true); sessionStorage.removeItem(storageKey); return;
        }
        setMessage('No pudimos confirmar el resultado todavía. Seguimos consultando la misma solicitud para evitar duplicados.');
      }
      timer = setTimeout(() => void check(), 2500);
    }
    void check();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [api, operation, storageKey]);
  return { start, locked: Boolean(operation), terminal, message };
}
