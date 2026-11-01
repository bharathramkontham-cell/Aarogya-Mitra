        <p className="mt-1 font-semibold text-slate-700">
          {sentUnacked.length} reminder{sentUnacked.length !== 1 ? 's' : ''} waiting for you to acknowledge.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm">
          Dismiss warnings
        </Button>
        {failed.length > 0 && (
          <Button variant="ghost" size="sm">
            Retry reminder delivery
          </Button>
        )}
      </div>
    </div>
  );
}
