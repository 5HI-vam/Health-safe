const CaseEvent = require('../models/CaseEvent');

class CaseTimelineService {
  /**
   * Logs an immutable case lifecycle event into the audit record
   *
   * @param {Object} eventData
   * @param {string} eventData.caseId
   * @param {string} eventData.eventType
   * @param {string} [eventData.actorId]
   * @param {string} [eventData.actorRole]
   * @param {string} eventData.description
   * @param {Object} [eventData.metadata]
   * @param {boolean} [eventData.isInternal]
   * @param {Date} [eventData.timestamp]
   * @returns {Promise<Object>}
   */
  async logEvent({
    caseId,
    eventType,
    actorId = 'system',
    actorRole = 'SYSTEM',
    description,
    metadata = {},
    isInternal = false,
    timestamp = new Date(),
  }) {
    if (!caseId || !eventType || !description) {
      console.warn('[CaseTimelineService] Missing required event fields:', { caseId, eventType, description });
      return null;
    }

    try {
      const event = new CaseEvent({
        caseId: caseId.trim().toUpperCase(),
        eventType,
        actorId: actorId || 'system',
        actorRole: actorRole || 'SYSTEM',
        description: description.trim(),
        metadata,
        isInternal: Boolean(isInternal),
        timestamp: timestamp || new Date(),
      });

      return await event.save();
    } catch (err) {
      console.error('[CaseTimelineService] Failed to log event:', err.message);
      return null;
    }
  }

  /**
   * Retrieves all events for a case, with access-level filtering
   *
   * @param {string} caseId
   * @param {Object} options
   * @param {boolean} [options.includeInternal=false]
   * @returns {Promise<Array>}
   */
  async getCaseEvents(caseId, { includeInternal = false } = {}) {
    const cleanId = (caseId || '').trim().toUpperCase();
    const query = { caseId: cleanId };

    if (!includeInternal) {
      query.isInternal = false;
    }

    return await CaseEvent.find(query)
      .sort({ timestamp: 1, createdAt: 1 })
      .lean();
  }
}

const caseTimelineService = new CaseTimelineService();

module.exports = {
  caseTimelineService,
  CaseTimelineService,
};
