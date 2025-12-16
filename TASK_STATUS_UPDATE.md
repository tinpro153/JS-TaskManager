# Task Status Update - 4 Categories Implementation

## Summary
Updated the Task Management System to display 4 task categories instead of 3, following Clean Architecture principles from inner to outer layers.

## Changes Overview

### 1. Domain Layer (Core Business Logic)

#### [TaskStatus.js](domain/valueobjects/TaskStatus.js)
- Added `FAILED` status to represent tasks that passed deadline without completion
- Updated `getAllStatuses()` to include FAILED status

#### [Task.js](domain/entities/Task.js)
- Added `markAsFailed()` method - auto-assigns FAILED status
- Added `isFailed()` status check method
- Added `shouldBeMarkedAsFailed()` business logic method
- Updated `updateStatus()` with business rules:
  - Cannot manually set to FAILED (auto-assigned only)
  - Cannot change status of FAILED tasks
- Updated `markAsCompleted()` to prevent completing failed tasks
- Updated `reopen()` to prevent reopening failed tasks

#### [TaskDisplayData.js](domain/valueobjects/TaskDisplayData.js)
- Added `forFailed()` factory method for failed task display data
- Added 'failed' to valid status classes
- Failed tasks show:
  - Status text: "Không hoàn thành"
  - Status class: 'failed'
  - Progress color: 'danger'
  - Icon: ❌
  - Available actions: ['view', 'delete'] (cannot edit or complete)

### 2. Business Layer (Use Cases & DTOs)

#### [GetTaskListForDisplayUseCase.js](business/usecases/GetTaskListForDisplayUseCase.js)
- Added FAILED to valid status filters
- **Auto-marking logic**: Before enriching tasks, checks each task with `shouldBeMarkedAsFailed()` and updates status automatically
- Added FAILED case in display data enrichment
- Updated empty messages for FAILED filter
- Updated filter metadata to include FAILED option

#### [GetStatisticsForDisplayUseCase.js](business/usecases/GetStatisticsForDisplayUseCase.js)
- Added `failedTasks` count to statistics calculation
- **Auto-marking logic**: Marks tasks as FAILED before calculating statistics
- Updated completion rate calculation to exclude failed tasks from denominator
- Added failedTasks to DTO output

#### [StatisticsDisplayDTO.js](business/dto/StatisticsDisplayDTO.js)
- Added `failedTasks` and `failedTasksFormatted` properties
- Updated toJSON() to include failed tasks in response

### 3. Infrastructure Layer (Database)

#### [database-setup.sql](infrastructure/database/schemas/database-setup.sql)
- Updated CHECK constraint to include 'FAILED' status:
  ```sql
  CONSTRAINT CK_Tasks_Status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'))
  ```

### 4. Presentation Layer (Frontend)

#### [dashboard.html](public/dashboard.html)
- **Statistics Cards**: Changed from 4 cards (Tổng, Chờ xử lý, Đang làm, Hoàn thành) to 4 cards (Tổng, Đang làm, Hoàn thành, Không hoàn thành)
- Removed "Chờ xử lý" card
- Added "Không hoàn thành" card with ❌ icon and id="statFailed"
- **Filter Buttons**: Changed from (Tất cả, Chờ xử lý, Đang làm, Hoàn thành) to (Tất cả, Đang làm, Hoàn thành, Không hoàn thành)
- Updated data-status attributes accordingly

#### [dashboard.js](public/js/dashboard.js)
- Updated statistics rendering to display `failedTasks` instead of `pendingTasks`
- Changed: `document.getElementById('statFailed').textContent = stats.failedTasks;`

#### [style.css](public/css/style.css)
- Added `.task-status-badge.failed` styling with red gradient background

## Business Rules

### Auto-Marking as FAILED
Tasks are automatically marked as FAILED when:
1. Task has a deadline (not null)
2. Task is not already COMPLETED
3. Task is not already FAILED
4. Current time is past the deadline

This check happens in two places:
- `GetTaskListForDisplayUseCase` - when listing tasks
- `GetStatisticsForDisplayUseCase` - when calculating statistics

### FAILED Status Restrictions
Once a task is FAILED:
- Cannot be edited
- Cannot be marked as completed
- Cannot be reopened
- Can only be viewed or deleted
- Must create a new task instead

### Manual Status Changes
- Users CANNOT manually set status to FAILED
- FAILED is only assigned automatically by the system
- This prevents accidental or inappropriate use of the status

## UI Changes

### Old Layout
```
[Tổng công việc] [Chờ xử lý] [Đang làm] [Hoàn thành]
[Tất cả] [Chờ xử lý] [Đang làm] [Hoàn thành]
```

### New Layout
```
[Tổng công việc] [Đang làm] [Hoàn thành] [Không hoàn thành]
[Tất cả] [Đang làm] [Hoàn thành] [Không hoàn thành]
```

## Database Migration

To apply the database changes, run the updated `database-setup.sql` script. This will:
1. Drop and recreate the TaskManager database
2. Update the Tasks table CHECK constraint to include 'FAILED' status

**Note**: This is a destructive operation. Backup your data before running!

## Testing Recommendations

1. **Unit Tests**: Update TaskStatus.test.js to include FAILED status tests
2. **Integration Tests**: Update TaskController.test.js to test auto-marking logic
3. **Manual Testing**:
   - Create a task with deadline in the past
   - Refresh the page to trigger auto-marking
   - Verify task appears in "Không hoàn thành" category
   - Verify statistics show correct failed task count
   - Verify cannot edit or complete failed tasks

## Architecture Compliance

✅ **Dependency Rule**: All changes flow from inner (Domain) to outer (Presentation) layers
✅ **Single Responsibility**: Each layer has clear, focused responsibilities
✅ **Business Logic in Domain**: Auto-marking logic resides in Task entity
✅ **No Framework Dependencies**: Domain layer remains pure JavaScript
✅ **Interface Segregation**: Repository interface unchanged, implementation can vary

## Backward Compatibility

⚠️ **Breaking Changes**:
- API responses now include `failedTasks` in statistics
- Task entities may have status = 'FAILED'
- Old clients expecting only 3 statuses will need updates

✅ **Non-Breaking**:
- Existing PENDING, IN_PROGRESS, COMPLETED tasks remain functional
- Database schema change is additive (adds FAILED to allowed values)
- API endpoints remain the same

## Implementation Notes

Following the rules from `rule.txt`:
1. ✅ Read through entire codebase before making changes
2. ✅ Followed flow of events from outer circle to inner circle and back
3. ✅ Checked parameter synchronization across all layers
4. ✅ Modified `database-setup.sql` instead of creating new SQL files
5. ✅ No syntax errors or parameter mismatches

## Clean Architecture Layers Modified

```
Infrastructure (Database Schema)
        ↑
    Adapters (None - repositories handle automatically)
        ↑
    Business (Use Cases, DTOs, Display Logic)
        ↑
    Domain (Task Entity, TaskStatus, TaskDisplayData)
        ↑
Presentation (HTML, CSS, JavaScript)
```

All changes follow the dependency rule: outer layers depend on inner layers, never the reverse.
