import React, { useEffect, useMemo, useRef, useState } from "react";

export function SupportChatPage({
  apiBase,
  token,
  fetchApi,
  PageHeader,
  PageState,
  miniStat,
  formatDate,
  formatRelativeAge,
  isOlderThanMinutes,
  supportCannedReplies,
  supportConversationsRefreshMs,
  supportMessagesRefreshMs
}) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [inboxFilter, setInboxFilter] = useState("all");
  const messagesRef = useRef(null);

  function normalizeConversationListResponse(data) {
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.conversations)) {
      return data.conversations;
    }
    return [];
  }

  useEffect(() => {
    let active = true;

    async function loadConversations(showLoader = false, preferredConversationId = "") {
      if (showLoader) {
        setLoading(true);
      }
      try {
        const data = await fetchApi(apiBase, "/api/admin/chat-conversations", token);
        if (!active) return;
        const nextConversations = normalizeConversationListResponse(data);
        setConversations(nextConversations);
        setSelectedId((current) => {
          if (preferredConversationId && nextConversations.some((conversation) => conversation.id === preferredConversationId)) {
            return preferredConversationId;
          }
          if (current && nextConversations.some((conversation) => conversation.id === current)) {
            return current;
          }
          return nextConversations[0]?.id || "";
        });
        setError("");
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message);
      } finally {
        if (active && showLoader) {
          setLoading(false);
        }
      }
    }

    loadConversations(true);
    const timer = window.setInterval(() => loadConversations(false), supportConversationsRefreshMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [apiBase, fetchApi, supportConversationsRefreshMs, token]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let active = true;

    async function loadMessages(showLoader = false) {
      if (showLoader) {
        setLoading(true);
      }
      try {
        const query = new URLSearchParams({ conversationId: selectedId });
        const data = await fetchApi(apiBase, `/api/admin/chat-messages?${query.toString()}`, token);
        if (!active) return;
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedId
              ? {
                  ...conversation,
                  unreadForAdmin: 0,
                  lastMessageAt: data.conversation?.lastMessageAt || conversation.lastMessageAt
                }
              : conversation
          )
        );
        setError("");
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message);
      } finally {
        if (active && showLoader) {
          setLoading(false);
        }
      }
    }

    loadMessages(true);
    const timer = window.setInterval(() => loadMessages(false), supportMessagesRefreshMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [apiBase, fetchApi, selectedId, supportMessagesRefreshMs, token]);

  useEffect(() => {
    const viewport = messagesRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  async function handleSend(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!selectedId || !text || sending) return;

    setSending(true);
    setNotice("");
    try {
      const data = await fetchApi(apiBase, "/api/admin/chat-send", token, {
        method: "POST",
        body: {
          conversationId: selectedId,
          text
        }
      });
      setMessages((current) => {
        if (Array.isArray(data.messages)) {
          return data.messages;
        }
        if (data.message) {
          return [...current, data.message];
        }
        return current;
      });
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedId
            ? {
                ...conversation,
                lastMessagePreview: text,
                lastMessageAt: data.message?.createdAt || data.conversation?.lastMessageAt || new Date().toISOString(),
                unreadForAdmin: 0
              }
            : conversation
        )
      );
      setDraft("");
      setError("");
      setNotice("Reply sent successfully.");
    } catch (sendError) {
      setError(sendError.message);
      setNotice("");
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(status) {
    if (!selectedId || statusBusy) return;
    setStatusBusy(true);
    setNotice("");
    try {
      const data = await fetchApi(apiBase, "/api/admin/chat-status", token, {
        method: "POST",
        body: {
          conversationId: selectedId,
          status
        }
      });
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedId
            ? {
                ...conversation,
                status: data.conversation?.status || status
              }
            : conversation
        )
      );
      setNotice(`Thread marked ${String(status).toLowerCase()}.`);
      setError("");
    } catch (statusError) {
      setError(statusError.message || "Unable to update thread status.");
      setNotice("");
    } finally {
      setStatusBusy(false);
    }
  }

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId) || null;
  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...conversations]
      .filter((conversation) => {
        const matchesSearch =
          !q ||
          String(conversation.userName || "").toLowerCase().includes(q) ||
          String(conversation.userPhone || "").toLowerCase().includes(q) ||
          String(conversation.lastMessagePreview || "").toLowerCase().includes(q);
        const matchesFilter =
          inboxFilter === "all" ||
          (inboxFilter === "unread" && Number(conversation.unreadForAdmin || 0) > 0) ||
          (inboxFilter === "waiting" && isOlderThanMinutes(conversation.lastMessageAt || conversation.updatedAt, 15)) ||
          (inboxFilter === "recent" && !isOlderThanMinutes(conversation.lastMessageAt || conversation.updatedAt, 60)) ||
          (inboxFilter === "resolved" && String(conversation.status || "").toUpperCase() === "RESOLVED");
        return matchesSearch && matchesFilter;
      })
      .sort((left, right) => {
        const unreadDelta = Number(right.unreadForAdmin || 0) - Number(left.unreadForAdmin || 0);
        if (unreadDelta !== 0) return unreadDelta;
        return new Date(right.lastMessageAt || right.updatedAt || 0).getTime() - new Date(left.lastMessageAt || left.updatedAt || 0).getTime();
      });
  }, [conversations, inboxFilter, isOlderThanMinutes, search]);
  const unreadCount = conversations.reduce((sum, conversation) => sum + Number(conversation.unreadForAdmin || 0), 0);
  const waitingCount = conversations.filter((conversation) => isOlderThanMinutes(conversation.lastMessageAt || conversation.updatedAt, 15)).length;
  const recentCount = conversations.filter((conversation) => !isOlderThanMinutes(conversation.lastMessageAt || conversation.updatedAt, 60)).length;
  const resolvedCount = conversations.filter((conversation) => String(conversation.status || "").toUpperCase() === "RESOLVED").length;

  if (loading && !conversations.length && !selectedId) {
    return <PageState title="Support Chat" subtitle="Loading support inbox..." />;
  }

  return (
    <>
      <PageHeader title="Support Chat" subtitle="User app se aane wale real support messages yahan live dikhte hain aur yahin se reply bheja ja sakta hai." />
      <section className="panel">
        <div className="queue-overview-grid">
          <div className="queue-overview-card">
            <span className="queue-overview-kicker">Unread Threads</span>
            <strong>{unreadCount}</strong>
            <p>Fresh user messages jin par admin side se response abhi pending hai.</p>
          </div>
          <div className="queue-overview-card">
            <span className="queue-overview-kicker">Waiting Longer</span>
            <strong>{waitingCount}</strong>
            <p>15 minute se zyada old threads jinko fast response dena chahiye.</p>
          </div>
          <div className="queue-overview-card">
            <span className="queue-overview-kicker">Active This Hour</span>
            <strong>{recentCount}</strong>
            <p>Recent conversations jahan operator ko real-time inbox feel milna chahiye.</p>
          </div>
          <div className="queue-overview-card">
            <span className="queue-overview-kicker">Resolved Queue</span>
            <strong>{resolvedCount}</strong>
            <p>Resolved chats 10 din tak rahengi, uske baad automatically delete ho jayengi.</p>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="mini-stats">
          {[
            miniStat("Conversations", conversations.length),
            miniStat("Unread", unreadCount),
            miniStat("Open Thread", selectedConversation?.userName || "None"),
            miniStat("Resolved", resolvedCount)
          ]}
        </div>
      </section>
      <section className="panel">
        <div className="support-layout">
          <div className="support-list">
            <div className="support-list-head">
              <h3>Conversations</h3>
              <span>{filteredConversations.length} shown</span>
            </div>
            <label className="support-search">
              <span>Search Inbox</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="User, phone, last message" />
            </label>
            <div className="filter-pills">
              {[
                { key: "all", label: "All" },
                { key: "unread", label: "Unread" },
                { key: "waiting", label: "Waiting" },
                { key: "recent", label: "Recent" },
                { key: "resolved", label: "Resolved" }
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={`filter-pill${inboxFilter === filter.key ? " active" : ""}`}
                  onClick={() => setInboxFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {filteredConversations.length ? (
              <div className="support-list-items">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`support-item${conversation.id === selectedId ? " active" : ""}`}
                    onClick={() => {
                      setSelectedId(conversation.id);
                      setNotice("");
                    }}
                  >
                    <div className="support-item-head">
                      <strong>{conversation.userName || "Unknown user"}</strong>
                      <span>{formatDate(conversation.lastMessageAt || conversation.updatedAt)}</span>
                    </div>
                    <div className="support-item-meta">
                      <span>{conversation.userPhone || "No phone"}</span>
                      {conversation.unreadForAdmin > 0 ? <em>{conversation.unreadForAdmin} new</em> : null}
                    </div>
                    <p>{conversation.lastMessagePreview || "Conversation started"}</p>
                    <small>{formatRelativeAge(conversation.lastMessageAt || conversation.updatedAt)}</small>
                    {conversation.resolvedAt ? <small>Auto delete after 10 days from {formatDate(conversation.resolvedAt)}</small> : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="message">{conversations.length ? "Current search me koi conversation match nahi hui." : "Abhi tak koi support conversation start nahi hui."}</p>
            )}
          </div>

          <div className="support-thread">
            {selectedConversation ? (
              <>
                <div className="support-thread-head">
                  <div>
                    <h3>{selectedConversation.userName || "Unknown user"}</h3>
                    <p>{selectedConversation.userPhone || "No phone"} | {selectedConversation.userId || "-"}</p>
                  </div>
                  <span className="support-thread-status">{selectedConversation.status || "open"}</span>
                </div>
                <div className="support-status-actions">
                  {["OPEN", "PENDING", "RESOLVED"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`filter-pill${String(selectedConversation.status || "").toUpperCase() === status ? " active" : ""}`}
                      disabled={statusBusy}
                      onClick={() => void handleStatusChange(status)}
                    >
                      {statusBusy && String(selectedConversation.status || "").toUpperCase() === status ? "Saving..." : status}
                    </button>
                  ))}
                </div>
                <div className="support-thread-summary">
                  <div className="support-thread-stat">
                    <span>Last activity</span>
                    <strong>{formatRelativeAge(selectedConversation.lastMessageAt || selectedConversation.updatedAt)}</strong>
                  </div>
                  <div className="support-thread-stat">
                    <span>Messages</span>
                    <strong>{messages.length}</strong>
                  </div>
                  <div className="support-thread-stat">
                    <span>Unread on admin</span>
                    <strong>{selectedConversation.unreadForAdmin || 0}</strong>
                  </div>
                  <div className="support-thread-stat">
                    <span>Resolved on</span>
                    <strong>{selectedConversation.resolvedAt ? formatDate(selectedConversation.resolvedAt) : "-"}</strong>
                  </div>
                </div>

                <div className="support-messages" ref={messagesRef}>
                  {messages.length ? messages.map((message) => {
                    const isAdmin = message.senderRole === "support" || message.senderRole === "admin";
                    return (
                      <article key={message.id} className={`support-bubble${isAdmin ? " admin" : " user"}`}>
                        <header>
                          <strong>{isAdmin ? "Support" : selectedConversation.userName || "User"}</strong>
                          <span>{formatDate(message.createdAt)}</span>
                        </header>
                        <p>{message.text}</p>
                      </article>
                    );
                  }) : (
                    <p className="message">Is conversation me abhi koi message nahi hai.</p>
                  )}
                </div>

                <form className="support-reply-form" onSubmit={handleSend}>
                  <div className="support-canned">
                    <span>Quick Replies</span>
                    <div className="support-canned-list">
                      {supportCannedReplies.map((reply) => (
                        <button
                          key={reply}
                          type="button"
                          className="secondary"
                          onClick={() => setDraft(reply)}
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label>
                    <span>Reply message</span>
                    <textarea
                      rows={4}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="User ko yahan se direct reply bhejiye..."
                    />
                  </label>
                  <div className="actions">
                    <button type="submit" className="primary" disabled={sending || !draft.trim()}>
                      {sending ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="support-empty">
                <h3>Select a conversation</h3>
                <p>User app me jab koi message bhejega to yahan thread open ho jayega.</p>
              </div>
            )}
          </div>
        </div>
        <p className={`message ${error ? "error" : notice ? "success" : ""}`}>{error || notice || "Auto refresh har 5 second me chal raha hai."}</p>
      </section>
    </>
  );
}
