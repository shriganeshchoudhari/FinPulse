package com.finpulse.backend.service;

import com.finpulse.backend.domain.event.TradeExecutedEvent;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.PriorityQueue;

@Component
public class MatchingEngine {

    // Price-Time Priority Queues
    // BUY orders: Highest price first. If tied, oldest first.
    private final PriorityQueue<TradeExecutedEvent> bidBook = new PriorityQueue<>(
            Comparator.comparing(TradeExecutedEvent::getPrice).reversed()
                    .thenComparing(TradeExecutedEvent::getExecutedAt)
    );

    // SELL orders: Lowest price first. If tied, oldest first.
    private final PriorityQueue<TradeExecutedEvent> askBook = new PriorityQueue<>(
            Comparator.comparing(TradeExecutedEvent::getPrice)
                    .thenComparing(TradeExecutedEvent::getExecutedAt)
    );

    public synchronized void addOrder(TradeExecutedEvent event) {
        if ("BUY".equalsIgnoreCase(event.getSide())) {
            matchBuyOrder(event);
        } else {
            matchSellOrder(event);
        }
    }

    private void matchBuyOrder(TradeExecutedEvent buyOrder) {
        while (buyOrder.getQuantity().compareTo(BigDecimal.ZERO) > 0 && !askBook.isEmpty()) {
            TradeExecutedEvent bestAsk = askBook.peek();
            
            // If best ask is more expensive than our buy price, no match
            if (bestAsk.getPrice().compareTo(buyOrder.getPrice()) > 0) {
                break;
            }

            // Match found!
            BigDecimal tradeQuantity = buyOrder.getQuantity().min(bestAsk.getQuantity());
            
            // Execute trade at the maker's price (the best ask price)
            executeMatch(buyOrder, bestAsk, tradeQuantity, bestAsk.getPrice());

            // Reduce quantities
            buyOrder.setQuantity(buyOrder.getQuantity().subtract(tradeQuantity));
            bestAsk.setQuantity(bestAsk.getQuantity().subtract(tradeQuantity));

            // If maker is filled, remove from book
            if (bestAsk.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                askBook.poll();
            }
        }

        // If still quantity left, add to book
        if (buyOrder.getQuantity().compareTo(BigDecimal.ZERO) > 0) {
            bidBook.add(buyOrder);
        }
    }

    private void matchSellOrder(TradeExecutedEvent sellOrder) {
        while (sellOrder.getQuantity().compareTo(BigDecimal.ZERO) > 0 && !bidBook.isEmpty()) {
            TradeExecutedEvent bestBid = bidBook.peek();
            
            // If best bid is cheaper than our sell price, no match
            if (bestBid.getPrice().compareTo(sellOrder.getPrice()) < 0) {
                break;
            }

            // Match found!
            BigDecimal tradeQuantity = sellOrder.getQuantity().min(bestBid.getQuantity());
            
            // Execute trade at the maker's price (the best bid price)
            executeMatch(bestBid, sellOrder, tradeQuantity, bestBid.getPrice());

            // Reduce quantities
            sellOrder.setQuantity(sellOrder.getQuantity().subtract(tradeQuantity));
            bestBid.setQuantity(bestBid.getQuantity().subtract(tradeQuantity));

            // If maker is filled, remove from book
            if (bestBid.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                bidBook.poll();
            }
        }

        // If still quantity left, add to book
        if (sellOrder.getQuantity().compareTo(BigDecimal.ZERO) > 0) {
            askBook.add(sellOrder);
        }
    }

    private void executeMatch(TradeExecutedEvent buyOrder, TradeExecutedEvent sellOrder, BigDecimal quantity, BigDecimal price) {
        // In a real system, we would publish a TradeMatchedEvent to Kafka here.
        // For now, we simulate matching by printing to stdout.
        System.out.printf("MATCHED! %s units @ $%s (Buyer: %s, Seller: %s)%n",
                quantity, price, buyOrder.getUserId(), sellOrder.getUserId());
    }

    public synchronized int getBidDepth() {
        return bidBook.size();
    }

    public synchronized int getAskDepth() {
        return askBook.size();
    }
}
